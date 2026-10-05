import { describe, expect, it } from "vitest";
import {
  addDaysToKey,
  dateKey,
  durationMinutes,
  formatDuration,
  isValidDayKey,
  weekdayOfKey,
  zonedInstant,
} from "@/lib/dates";

/**
 * Fechas de la clínica.
 *
 * La clínica opera en America/Santiago, pero el servidor y el navegador
 * pueden estar en cualquier zona (en CI, UTC). Todo lo que sea un DÍA se
 * maneja como clave "yyyy-MM-dd" calculada con operaciones UTC: si se
 * mezclara con la hora local, un lunes de la tarde puede caer en el día
 * anterior y aparecer una agenda corrida.
 */
describe("claves de día", () => {
  it("acepta claves con formato y fecha reales", () => {
    expect(isValidDayKey("2026-10-05")).toBe(true);
    expect(isValidDayKey("2026-02-28")).toBe(true);
  });

  it("rechaza claves mal formadas", () => {
    for (const malo of [
      "05-10-2026",
      "2026-10-5",
      "2026/10/05",
      "",
      "ayer",
      undefined,
      null,
    ]) {
      expect(isValidDayKey(malo as string | null | undefined), String(malo)).toBe(false);
    }
  });

  it("rechaza fechas que no existen", () => {
    expect(isValidDayKey("2026-02-30")).toBe(false);
    expect(isValidDayKey("2026-13-01")).toBe(false);
    expect(isValidDayKey("2026-00-10")).toBe(false);
  });

  it("suma días cruzando el mes y el año", () => {
    expect(addDaysToKey("2026-10-05", 1)).toBe("2026-10-06");
    expect(addDaysToKey("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("suma días sobre un año bisiesto", () => {
    expect(addDaysToKey("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysToKey("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("calcula el día de la semana en UTC, no en la zona del proceso", () => {
    // 2026-10-05 es lunes. Si esto se calculara con la hora local de la
    // máquina, en UTC-3 sería domingo.
    expect(weekdayOfKey("2026-10-05")).toBe(1);
    expect(weekdayOfKey("2026-10-06")).toBe(2); // martes
    expect(weekdayOfKey("2026-10-11")).toBe(0); // domingo
  });

  it("dateKey de un instante UTC devuelve el día correcto en Santiago", () => {
    // 00:30 UTC del lunes 5 es las 20:30 del domingo 4 en Santiago
    // (UTC-3). El selector de día no debe correrse.
    expect(dateKey("2026-10-05T00:30:00Z", "America/Santiago")).toBe("2026-10-04");
    // 03:00 UTC ya es lunes en Santiago.
    expect(dateKey("2026-10-05T03:00:00Z", "America/Santiago")).toBe("2026-10-05");
  });
});

describe("zonedInstant", () => {
  it("convierte hora de Santiago a UTC con el offset de invierno", () => {
    // Octavo 2026 -> UTC-3.
    expect(zonedInstant("2026-10-05", "09:00")).toBe("2026-10-05T12:00:00.000Z");
  });

  it("usa el offset de verano cuando corresponde", () => {
    // Enero 2026 -> UTC-3.
    expect(zonedInstant("2026-01-15", "09:00")).toBe("2026-01-15T12:00:00.000Z");
    // El cambio horario chileno es en abril y septiembre; la hora de la
    // clínica debe seguir significando 09:00 local en ambos casos.
    expect(zonedInstant("2026-04-05", "09:00")).toMatch(/^2026-04-05T1[23]:00:00\.000Z$/);
    expect(zonedInstant("2026-09-06", "09:00")).toMatch(/^2026-09-06T1[23]:00:00\.000Z$/);
  });
});

describe("duración", () => {
  it("calcula los minutos entre dos instantes", () => {
    expect(
      durationMinutes("2026-10-05T12:00:00Z", "2026-10-05T12:30:00Z"),
    ).toBe(30);
    expect(
      durationMinutes("2026-10-05T12:00:00Z", "2026-10-05T13:00:00Z"),
    ).toBe(60);
  });

  it("formatea en minutos y horas", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(45)).toBe("45 min");
  });
});