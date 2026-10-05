import { describe, expect, it } from "vitest";
import { buildIcs, type IcsEvent } from "@/lib/ics";

/**
 * Regresiones del .ics.
 *
 * El bug de producción era doble:
 *  1. `formatInTimeZone(..., "YYYYMMDD")` en date-fns v4 lanza RangeError
 *     (el token correcto es `yyyy`), lo que devolvía 500 en TODA reserva
 *     porque el adjunto se armaba antes de enviar el correo.
 *  2. La zona horaria venía hardcodeada con transiciones DST que ya no
 *     correspondían, así que las citas salían corridas.
 *
 * Ahora se emite en UTC sin VTIMEZONE: una cita es un instante absoluto y
 * el cliente lo muestra en la zona local del teléfono.
 */
const base: IcsEvent = {
  uid: "abc-123",
  startsAt: "2026-10-02T12:00:00+00:00",
  endsAt: "2026-10-02T12:30:00+00:00",
  summary: "Control dental",
  description: "Cita de 30 minutos",
  location: "Av. Providencia 1234, Of. 502, Santiago",
};

describe("buildIcs", () => {
  it("no lanza con fechas en offset (el RangeError de date-fns)", () => {
    expect(() => buildIcs(base)).not.toThrow();
  });

  it("emite DTSTART y DTEND en UTC bien formados", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("DTSTART:20261002T120000Z");
    expect(ics).toContain("DTEND:20261002T123000Z");
  });

  it("no duplica la Z en DTSTAMP (regresión del replace)", () => {
    const ics = buildIcs(base);
    const stamp = ics.split("\r\n").find((l) => l.startsWith("DTSTAMP:"));
    expect(stamp).toMatch(/^DTSTAMP:\d{8}T\d{6}Z$/);
    expect(stamp).not.toContain("ZZ");
  });

  it("ninguna línea tiene una Z duplicada ni un offset pegado a la Z", () => {
    const ics = buildIcs(base);
    expect(ics).not.toContain("ZZ");
    expect(ics).not.toMatch(/\+0000Z/);
  });

  it("respeta la duración real de la cita", () => {
    const ics = buildIcs(base);
    // `Date.parse` no entiende el formato compacto de ICS, así que se
    // reensambla a ISO antes de restar.
    const compactoAIso = (c: string) =>
      `${c.slice(0, 4)}-${c.slice(4, 6)}-${c.slice(6, 8)}T` +
      `${c.slice(9, 11)}:${c.slice(11, 13)}:${c.slice(13, 15)}${c.slice(15)}`;

    const inicio = compactoAIso(/DTSTART:(\d{8}T\d{6}Z)/.exec(ics)![1]);
    const fin = compactoAIso(/DTEND:(\d{8}T\d{6}Z)/.exec(ics)![1]);
    const duracionMin = (Date.parse(fin) - Date.parse(inicio)) / 60_000;
    expect(duracionMin).toBe(30);
  });

  it("convierte un offset local al instante UTC correcto", () => {
    // 09:00 en Santiago (UTC-3, horario de invierno) = 12:00 UTC.
    const ics = buildIcs({
      ...base,
      startsAt: "2026-10-02T09:00:00-03:00",
      endsAt: "2026-10-02T09:30:00-03:00",
    });
    expect(ics).toContain("DTSTART:20261002T120000Z");
    expect(ics).toContain("DTEND:20261002T123000Z");
  });

  it("no incluye VTIMEZONE (se emite en UTC puro)", () => {
    const ics = buildIcs(base);
    expect(ics).not.toContain("VTIMEZONE");
    expect(ics).not.toContain("TZID");
  });

  it("usa CRLF, como exige RFC 5545", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("\r\n");
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR")).toBe(true);
  });

  it("escapa comas y saltos de línea del texto", () => {
    const ics = buildIcs({ ...base, summary: "Control, limpieza y profilaxis" });
    expect(ics).toContain("SUMMARY:Control\\, limpieza y profilaxis");
  });

  it("rechaza una fecha ilegible en vez de emitir basura", () => {
    expect(() => buildIcs({ ...base, startsAt: "no-es-una-fecha" })).toThrow(/fecha/i);
  });

  it("dobla las líneas largas", () => {
    const ics = buildIcs({ ...base, description: "x".repeat(300) });
    const lines = ics.split("\r\n");
    const demasiadoLarga = lines.find((l) => l.length > 75 && !l.startsWith(" "));
    expect(demasiadoLarga, "ninguna línea debería pasar de 75 octetos").toBeUndefined();
  });
});