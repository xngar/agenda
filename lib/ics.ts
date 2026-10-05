/**
 * Generación de .ics (RFC 5545) para adjuntar al correo de confirmación.
 *
 * Hecho a mano a propósito: son unas 40 líneas y así no sumamos una
 * dependencia que sólo se usa en el envío de correos.
 *
 * DECISIÓN: las fechas se emiten en UTC (`DTSTART:...Z`) y NO se incluye
 * VTIMEZONE. Ya se intentó VTIMEZONE con transiciones DST hardcodeadas
 * para Chile y es una fuente de errores silenciosos: las fechas de cambio
 * de horario hay que actualizarlas cada año, y si quedan desactualizadas
 * la cita aparece movida. Con UTC el instante es inequívoco y todos los
 * clientes de agenda lo muestran bien, sin depender de su base de datos
 * de zonas horarias. Una cita es un instante absoluto, no una hora de
 * pared: si el paciente viaja, que se vea a la hora real en su zona.
 */

import { DEFAULT_TIMEZONE } from "./dates";

export interface IcsEvent {
  uid: string;
  startsAt: string;
  endsAt: string;
  summary: string;
  description: string;
  location: string;
  url?: string;
  timezone?: string;
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Instante en UTC formato compacto: 20261005T120000Z
 *
 * Se normaliza con `new Date(...)` + `toISOString()` y no con
 * `replace` sobre el texto de entrada. El enfoque anterior fallaba en los
 * dos casos reales:
 *
 *   "2026-10-02T12:00:00.000Z" -> "20261002T120000ZZ"   (Z duplicada)
 *   "2026-10-02T12:00:00-03:00" -> "20261002T120000-0300Z"  (offset + Z)
 *
 * Ninguno de los dos es un timestamp ICS válido: el archivo se abría mal
 * o la cita aparecía desplazada. Se lanza en vez de emitir basura.
 */
function icsUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`icsUtc: no se pudo interpretar la fecha "${iso}"`);
  }
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildIcs(event: IcsEvent): string {
  // La zona se conserva sólo para el texto legible de la descripción; el
  // timestamp del evento va en UTC.
  const timezone = event.timezone ?? DEFAULT_TIMEZONE;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agenda Clinica//ES//CL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(event.uid)}@agenda.clinica`,
    `DTSTAMP:${icsUtc(new Date().toISOString())}`,
    `DTSTART:${icsUtc(event.startsAt)}`,
    `DTEND:${icsUtc(event.endsAt)}`,
    `SUMMARY:${escapeIcs(event.summary)}`,
    `DESCRIPTION:${escapeIcs(`${event.description} (zona de la clínica: ${timezone})`)}`,
    `LOCATION:${escapeIcs(event.location)}`,
    ...(event.url ? [`URL:${escapeIcs(event.url)}`] : []),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n");
}

/**
 * Plegado de líneas a 75 octetos (RFC 5545 §3.1).
 *
 * Cortar por `length` cuenta UTF-16, no bytes: con tildes o emoji una
 * línea puede quedar en 76-150 bytes y los clientes estrictos la rechazan.
 * Por eso partimos en el límite y luego ajustamos hacia atrás si el
 * corte cayó en medio de un par surrogado.
 */
function foldLine(line: string): string {
  const MAX = 73;
  if (byteLength(line) <= MAX) return line;

  const parts: string[] = [];
  let rest = line;
  let limit = MAX;

  while (byteLength(rest) > MAX) {
    let cut = rest.slice(0, limit);
    // No partir entre los dos chars de un par surrogate.
    const lastCode = cut.charCodeAt(cut.length - 1);
    if (lastCode >= 0xd800 && lastCode <= 0xdbff) cut = cut.slice(0, -1);
    parts.push(cut);
    rest = rest.slice(cut.length);
    limit = MAX - 1; // las continuaciones llevan un espacio inicial
  }
  if (rest.length) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}
