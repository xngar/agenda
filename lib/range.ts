/**
 * Lectura de `tstzrange` de Postgres, sin dependencias de servidor.
 *
 * Vive aparte de `lib/booking.ts` a propósito: ese módulo importa el
 * cliente con service role y sólo funciona en el servidor, pero el panel
 * (cliente) también necesita leer el rango de cada cita.
 *
 * Postgres devuelve el rango como texto tipo
 *   ["2026-10-02 12:30:00+00","2026-10-02 13:00:00+00")
 * o como `{start,end}` si el cliente lo entrega parseado.
 */
export function parseRange(
  during: string | Record<string, string> | undefined,
): { start: string; end: string } {
  if (!during) return { start: "", end: "" };

  if (typeof during === "object") {
    return { start: toIso(during.start), end: toIso(during.end) };
  }

  const quoted = during.match(/"([^"]+)"/g);
  if (!quoted || quoted.length < 2) return { start: "", end: "" };

  return {
    start: toIso(quoted[0]!.slice(1, -1)),
    end: toIso(quoted[1]!.slice(1, -1)),
  };
}

/**
 * Normaliza "2026-10-02 12:30:00+00" a "2026-10-02T12:30:00+00:00", que es
 * lo que `Date` parsea sin ambigüedad.
 *
 * No se puede buscar el cierre del rango con un patrón
 * `"([^"]+)"(?:,|\]|$)`: la PRIMERA cadena del rango también va seguida de
 * coma, así que ese regex devolvía el inicio como fin. Consecuencia real:
 * citas de duración 0, correos que decían "09:00 hrs" en vez de
 * "09:00 – 09:30" y archivos .ics sin duración.
 */
function toIso(value: string | undefined): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}(:?\d{2})?)?$/.exec(
    value.trim(),
  );
  if (!match) return value;

  const [, date, time, , zone] = match;
  let offset = zone ?? "Z";
  if (offset === "Z") offset = "+00:00";
  else if (/^[+-]\d{2}$/.test(offset)) offset = `${offset}:00`;
  else if (/^[+-]\d{2}\d{2}$/.test(offset)) offset = `${offset.slice(0, 3)}:${offset.slice(3)}`;

  return `${date}T${time}${offset}`;
}

/** Igual que `parseRange`, pero con nombres del dominio de una cita. */
export function parseAppointmentRange(
  during: string | Record<string, string> | undefined,
): { start: string; end: string } {
  return parseRange(during);
}