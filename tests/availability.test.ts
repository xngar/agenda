import { describe, expect, it } from "vitest";
import {
  availabilityOverlaps,
  availabilityOverlapMessage,
  availabilityRuleSchema,
  availabilityRulesSchema,
  availabilitySlotSchema,
} from "@/lib/validation";

/**
 * Reglas de horario.
 *
 * Es el contrato compartido entre el formulario del panel y la API que guarda
 * en `availability_rules`, así que lo que falle aquí falla igual en cliente y
 * en servidor: el usuario ve el mismo error en la pantalla que el que decide
 * si el cambio se aplica.
 *
 * Dos reglas distintas definen el horario: la franja suelta (con el id del
 * profesional) y la lista completa que manda el formulario. La lista no
 * valida los solapes con `refine`, porque eso obligaría a un `refine` del
 * array completo y rompería los mensajes por franja; en su lugar se usa
 * `availabilityOverlaps`, que es la misma función que llama la API antes de
 * guardar.
 */
describe("franja de horario", () => {
  it("acepta una franja válida", () => {
    const ok = availabilitySlotSchema.safeParse({
      weekday: 1,
      startTime: "09:00",
      endTime: "13:00",
    });
    expect(ok.success).toBe(true);
  });

  it("la hora de término debe ser posterior al inicio", () => {
    const mal = availabilitySlotSchema.safeParse({
      weekday: 1,
      startTime: "19:00",
      endTime: "09:00",
    });
    expect(mal.success).toBe(false);
    if (!mal.success) {
      expect(mal.error.issues[0]?.message).toBe(
        "La hora de término debe ser posterior al inicio",
      );
      expect(mal.error.issues[0]?.path).toEqual(["endTime"]);
    }
  });

  it("una franja de duración cero también es inválida", () => {
    expect(
      availabilitySlotSchema.safeParse({
        weekday: 3,
        startTime: "10:00",
        endTime: "10:00",
      }).success,
    ).toBe(false);
  });

  it("exige dos dígitos en la hora, porque la comparación es por texto", () => {
    for (const mala of [
      { startTime: "9:00", endTime: "13:00" },
      { startTime: "09:00", endTime: "13:0" },
      { startTime: "09:00:00", endTime: "13:00:00" },
      { startTime: "0900", endTime: "1300" },
      { startTime: "", endTime: "13:00" },
    ]) {
      const r = availabilitySlotSchema.safeParse({ weekday: 1, ...mala });
      expect(r.success, JSON.stringify(mala)).toBe(false);
      if (!r.success) {
        expect(r.error.issues[0]?.message).toBe("Hora inválida");
      }
    }
  });

  it("sólo acepta los días de la semana, con 0 = domingo", () => {
    for (const weekday of [0, 1, 2, 3, 4, 5, 6]) {
      expect(
        availabilitySlotSchema.safeParse({ weekday, startTime: "09:00", endTime: "13:00" })
          .success,
        String(weekday),
      ).toBe(true);
    }
    for (const weekday of [-1, 7, 9, 1.5, NaN as number]) {
      expect(
        availabilitySlotSchema.safeParse({ weekday, startTime: "09:00", endTime: "13:00" })
          .success,
        String(weekday),
      ).toBe(false);
    }
  });

  it("no lleva el id del profesional dentro de la franja", () => {
    const r = availabilitySlotSchema.safeParse({
      weekday: 1,
      startTime: "09:00",
      endTime: "13:00",
    });
    expect(r.success).toBe(true);
    expect("doctorId" in (r.success ? r.data : {})).toBe(false);
  });
});

describe("regla con profesional (la fila completa)", () => {
  it("sí exige el id del profesional", () => {
    expect(availabilityRuleSchema.safeParse({ weekday: 1, startTime: "09:00", endTime: "13:00" }).success).toBe(false);
    expect(
      availabilityRuleSchema.safeParse({
        doctorId: "d4555fbf-7e8a-4f6d-901c-d6f2b410c55b",
        weekday: 1,
        startTime: "09:00",
        endTime: "13:00",
      }).success,
    ).toBe(true);
  });

  it("rechaza un id que no es un uuid", () => {
    expect(
      availabilityRuleSchema.safeParse({
        doctorId: "no-es-un-uuid",
        weekday: 1,
        startTime: "09:00",
        endTime: "13:00",
      }).success,
    ).toBe(false);
  });
});

describe("horario completo de un profesional", () => {
  const doctorId = "d4555fbf-7e8a-4f6d-901c-d6f2b410c55b";
  const franja = (weekday: number, startTime: string, endTime: string) => ({
    weekday,
    startTime,
    endTime,
  });

  it("acepta una lista vacía: es un profesional sin horas", () => {
    expect(
      availabilityRulesSchema.safeParse({ doctorId, rules: [] }).success,
    ).toBe(true);
  });

  it("acepta el horario semanal completo", () => {
    const rules = [
      franja(1, "09:00", "13:00"),
      franja(1, "15:00", "19:00"),
      franja(6, "09:00", "13:00"),
    ];
    expect(availabilityRulesSchema.safeParse({ doctorId, rules }).success).toBe(true);
  });

  it("rechaza más de 21 franjas, que es el máximo de la base", () => {
    const rules = Array.from({ length: 22 }, (_, i) =>
      franja(i % 7, "09:00", "13:00"),
    );
    const r = availabilityRulesSchema.safeParse({ doctorId, rules });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((issue) => issue.message.includes("Demasiadas"))).toBe(true);
    }
  });

  it("un error dentro de la lista apunta a la franja concreta", () => {
    const rules = [
      franja(1, "09:00", "13:00"),
      franja(2, "19:00", "09:00"),
    ];
    const r = availabilityRulesSchema.safeParse({ doctorId, rules });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(["rules", 1, "endTime"]);
    }
  });
});

describe("franjas solapadas", () => {
  it("detecta dos franjas que se cruzan", () => {
    expect(
      availabilityOverlaps([
        { weekday: 1, startTime: "09:00", endTime: "13:00" },
        { weekday: 1, startTime: "12:00", endTime: "15:00" },
      ]),
    ).toBe(true);
  });

  it("detecta una franja dentro de otra", () => {
    expect(
      availabilityOverlaps([
        { weekday: 4, startTime: "09:00", endTime: "19:00" },
        { weekday: 4, startTime: "10:00", endTime: "11:00" },
      ]),
    ).toBe(true);
  });

  it("detecta el orden invertido (la posterior primero en la lista)", () => {
    expect(
      availabilityOverlaps([
        { weekday: 6, startTime: "15:00", endTime: "19:00" },
        { weekday: 6, startTime: "09:00", endTime: "16:00" },
      ]),
    ).toBe(true);
  });

  it("franjas que se tocan por el borde NO son solape", () => {
    expect(
      availabilityOverlaps([
        { weekday: 1, startTime: "09:00", endTime: "13:00" },
        { weekday: 1, startTime: "13:00", endTime: "15:00" },
      ]),
    ).toBe(false);
  });

  it("franjas de días distintos nunca se cruzan", () => {
    expect(
      availabilityOverlaps([
        { weekday: 1, startTime: "09:00", endTime: "19:00" },
        { weekday: 2, startTime: "09:00", endTime: "19:00" },
      ]),
    ).toBe(false);
  });

  it("una sola franja o ninguna nunca solapa", () => {
    expect(availabilityOverlaps([])).toBe(false);
    expect(
      availabilityOverlaps([{ weekday: 3, startTime: "09:00", endTime: "13:00" }]),
    ).toBe(false);
  });

  it("tres franjas con solape en la última", () => {
    expect(
      availabilityOverlaps([
        { weekday: 5, startTime: "09:00", endTime: "11:00" },
        { weekday: 5, startTime: "11:00", endTime: "13:00" },
        { weekday: 5, startTime: "12:30", endTime: "14:00" },
      ]),
    ).toBe(true);
  });

  it("el mensaje es el mismo que muestra la API", () => {
    expect(availabilityOverlapMessage).toBe(
      "Dos franjas del mismo día no pueden solaparse",
    );
  });
});
