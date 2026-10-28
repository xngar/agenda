import { describe, expect, it } from "vitest";
import { appointmentsByDay, repartirEnCarriles } from "@/lib/agenda";
import type { DoctorAppointment } from "@/lib/types";

function cita(id: string, during: string): DoctorAppointment {
  return {
    id,
    doctor_id: "d1",
    patient_id: "p1",
    service_id: null,
    during,
    status: "confirmed",
    cancelled_by: null,
    cancel_reason: null,
    created_at: "2026-09-01T00:00:00Z",
    rescheduled_at: null,
    patient: null,
    service: null,
  };
}

/**
 * Agrupación por día de la clínica.
 *
 * El caso importante es el de la noche: en Santiago son las 23:30 del lunes
 * cuando en UTC ya es el martes, así que la cita debe quedar en el lunes. Si se
 * agrupara por UTC, la semana mostraría citas en el día equivocado.
 */
describe("appointmentsByDay", () => {
  it("agrupa por día local de la clínica, no por día UTC", () => {
    const mapa = appointmentsByDay([
      cita("a", '["2026-10-05 02:30:00+00","2026-10-05 03:00:00+00"]'),
    ]);
    expect([...mapa.keys()]).toEqual(["2026-10-04"]);
  });

  it("ordena cada día por hora de inicio", () => {
    const mapa = appointmentsByDay([
      cita("tarde", '["2026-10-06 20:00:00+00","2026-10-06 21:00:00+00"]'),
      cita("mañana", '["2026-10-06 13:00:00+00","2026-10-06 14:00:00+00"]'),
    ]);
    expect(mapa.get("2026-10-06")?.map((i) => i.cita.id)).toEqual(["mañana", "tarde"]);
  });

  it("separa los días en listas distintas", () => {
    const mapa = appointmentsByDay([
      cita("lun", '["2026-10-05 14:00:00+00","2026-10-05 15:00:00+00"]'),
      cita("mar", '["2026-10-06 14:00:00+00","2026-10-06 15:00:00+00"]'),
      cita("lun2", '["2026-10-05 16:00:00+00","2026-10-05 17:00:00+00"]'),
    ]);
    expect([...mapa.keys()]).toEqual(["2026-10-05", "2026-10-06"]);
    expect(mapa.get("2026-10-05")?.map((i) => i.cita.id)).toEqual(["lun", "lun2"]);
  });

  it("devuelve el inicio y el fin de cada cita", () => {
    const mapa = appointmentsByDay([
      cita("a", '["2026-10-05 14:00:00+00","2026-10-05 14:30:00+00"]'),
    ]);
    expect(mapa.get("2026-10-05")?.[0].start).toBe("2026-10-05T14:00:00+00:00");
    expect(mapa.get("2026-10-05")?.[0].end).toBe("2026-10-05T14:30:00+00:00");
  });
});

/**
 * Reparto en carriles.
 *
 * La razón de existir: en la vista de todo el equipo dos profesionales pueden
 * tener cita a la misma hora, y sin carriles los bloques se tapan y el segundo
 * queda invisible (una cita invisible es una cita que el paciente no atiende).
 */
describe("repartirEnCarriles", () => {
  const b = (id: string, startMin: number, endMin: number) => ({ id, startMin, endMin });

  it("sin solapamiento, cada bloque ocupa el ancho completo", () => {
    const r = repartirEnCarriles([b("a", 540, 570), b("b", 600, 630)]);
    expect(r.get("a")).toEqual({ carril: 0, carriles: 1 });
    expect(r.get("b")).toEqual({ carril: 0, carriles: 1 });
  });

  it("dos citas a la misma hora quedan en carriles distintos y mitad de ancho", () => {
    const r = repartirEnCarriles([b("a", 540, 600), b("b", 540, 600)]);
    expect(r.get("a")?.carril).toBe(0);
    expect(r.get("b")?.carril).toBe(1);
    expect(r.get("a")?.carriles).toBe(2);
    expect(r.get("b")?.carriles).toBe(2);
  });

  it("tres citas simultáneas usan tres carriles", () => {
    const r = repartirEnCarriles([b("a", 540, 600), b("b", 540, 600), b("c", 550, 560)]);
    expect(new Set([r.get("a")?.carril, r.get("b")?.carril, r.get("c")?.carril]).size).toBe(3);
    expect(r.get("c")?.carriles).toBe(3);
  });

  it("el solapamiento parcial cuenta: una cita corta dentro de otra abre carril", () => {
    // 09:00–10:00 y 09:30–10:30 se pisan. La tercera empieza a las 10:00: no se
    // pisa con la primera (que termina ahí), pero sí con la segunda, así que
    // entra en su grupo y queda a media columna.
    const r = repartirEnCarriles([b("larga", 540, 600), b("media", 570, 630), b("tarde", 600, 630)]);
    expect(r.get("media")?.carril).toBe(1);
    expect(r.get("larga")?.carriles).toBe(2);
    expect(r.get("tarde")).toEqual({ carril: 0, carriles: 2 });
  });

  it("tres citas encimadas necesitan tres carriles, no dos", () => {
    // 09:00–09:30 y 09:00–10:00 ocupan los dos primeros carriles; la de
    // 09:30–09:45 se pisa con las dos, así que necesita un tercero.
    const r = repartirEnCarriles([b("a", 540, 600), b("b", 540, 660), b("c", 570, 600)]);
    expect(r.get("c")?.carril).toBe(2);
    expect(r.get("c")?.carriles).toBe(3);
  });

  it("el solapamiento transitivo mantiene juntas las citas que no se tocan entre sí", () => {
    // A pisa a B, B pisa a C, pero A y C no: sin agrupar transitivamente, A
    // ocuparía el ancho completo y luego C quedaría con el ancho de dos.
    const r = repartirEnCarriles([b("a", 540, 600), b("b", 570, 630), b("c", 600, 660)]);
    expect(r.get("a")?.carriles).toBe(2);
    expect(r.get("b")?.carriles).toBe(2);
    expect(r.get("c")?.carriles).toBe(2);
  });

  it("reutiliza el carril que quedó libre en vez de abrir uno nuevo", () => {
    // "a" termina justo cuando "c" empieza, así que el carril 0 está libre y se
    // reutiliza: la cita queda a media columna en vez de partir el día en tres.
    const r = repartirEnCarriles([b("a", 540, 570), b("b", 540, 660), b("c", 570, 600)]);
    expect(r.get("c")?.carril).toBe(0);
    // Sigue en el grupo de las otras dos porque se pisa con "b".
    expect(r.get("c")?.carriles).toBe(2);
  });

  it("no le importa el orden de entrada", () => {
    const entrada = [b("c", 600, 660), b("a", 540, 600), b("b", 570, 630)];
    const r = repartirEnCarriles(entrada);
    expect(r.get("a")?.carril).toBe(0);
    expect(r.get("c")?.carriles).toBe(2);
  });

  it("aguanta una lista vacía", () => {
    expect(repartirEnCarriles([]).size).toBe(0);
  });
});