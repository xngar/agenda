import { describe, expect, it } from "vitest";
import { parseAppointmentRange, parseRange } from "@/lib/range";

/**
 * Regresión de `parseRange`.
 *
 * El bug original buscaba el cierre del rango con
 * `"([^"]+)"(?:,|\]|$)`. Como la PRIMERA cadena del rango también va
 * seguida de coma, ese patrón devolvía el INICIO como fin: todas las
 * citas duraban 0 minutos. Los correos decían "09:00 hrs" en vez de
 * "09:00 – 09:30" y los archivos .ics salían sin duración.
 */
describe("parseRange", () => {
  it("extrae inicio y fin del texto de Postgres", () => {
    // Esta es la forma REAL que devuelve Postgres para un tstzrange.
    const during = '["2026-10-02 12:30:00+00","2026-10-02 13:00:00+00")';
    const { start, end } = parseRange(during);
    expect(start).toBe("2026-10-02T12:30:00+00:00");
    expect(end).toBe("2026-10-02T13:00:00+00:00");
  });

  it("NO devuelve el inicio como fin (la regresión original)", () => {
    const during = '["2026-10-02 12:30:00+00","2026-10-02 13:00:00+00")';
    const { start, end } = parseRange(during);
    expect(end).not.toBe(start);
  });

  it("calcula una duración de 30 minutos, no de 0", () => {
    const { start, end } = parseRange(
      '["2026-10-02 12:30:00+00","2026-10-02 13:00:00+00")',
    );
    const minutos = (new Date(end).getTime() - new Date(start).getTime()) / 60_000;
    expect(minutos).toBe(30);
  });

  it("acepta las cuatro variantes de corchete", () => {
    for (const forma of ["[", "(", "]", ")"]) {
      const during = `${forma}"2026-10-02 09:00:00+00","2026-10-02 09:30:00+00"${forma}`;
      const { start, end } = parseRange(during);
      expect(end, `forma ${forma}`).toBe("2026-10-02T09:30:00+00:00");
      expect(start, `forma ${forma}`).toBe("2026-10-02T09:00:00+00:00");
    }
  });

  it("acepta la forma objeto", () => {
    const { start, end } = parseRange({
      start: "2026-10-02T12:00:00+00:00",
      end: "2026-10-02T12:30:00+00:00",
    });
    expect(start).toBe("2026-10-02T12:00:00+00:00");
    expect(end).toBe("2026-10-02T12:30:00+00:00");
  });

  it("normaliza sufijos de zona raros", () => {
    const casos: Array<[string, string]> = [
      ["2026-10-02 09:00:00-03", "2026-10-02T09:00:00-03:00"],
      ["2026-10-02 09:00:00-0300", "2026-10-02T09:00:00-03:00"],
      ["2026-10-02 09:00:00Z", "2026-10-02T09:00:00+00:00"],
      ["2026-10-02 09:00:00.123-03", "2026-10-02T09:00:00-03:00"],
    ];
    for (const [entrada, esperado] of casos) {
      // Con comillas: así es exactamente como Postgres entrega el rango.
      expect(parseRange(`["${entrada}","${entrada}")`).start, entrada).toBe(esperado);
    }
  });

  it("devuelve cadenas vacías ante entradas inservibles, sin lanzar", () => {
    expect(parseRange(undefined)).toEqual({ start: "", end: "" });
    expect(parseRange("")).toEqual({ start: "", end: "" });
    expect(parseRange("empty")).toEqual({ start: "", end: "" });
    expect(parseRange('["solo-una"]')).toEqual({ start: "", end: "" });
  });

  it("parseAppointmentRange es el mismo parser", () => {
    const during = '["2026-10-02 12:30:00+00","2026-10-02 13:00:00+00")';
    expect(parseAppointmentRange(during)).toEqual(parseRange(during));
  });
});