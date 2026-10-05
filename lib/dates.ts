import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale";

/**
 * Fechas y horas. Regla del proyecto: la disponibilidad SIEMPRE se
 * calcula en Postgres (que conoce America/Santiago y los cambios de hora
 * de verano). Aquí sólo formateamos o construimos instantes a partir de
 * una fecha + hora local + zona.
 */

export const DEFAULT_TIMEZONE = "America/Santiago";

export function formatTime(iso: string | Date, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(iso, timezone, "HH:mm", { locale: es });
}

export function formatDateLong(iso: string | Date, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(iso, timezone, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatDateMedium(iso: string | Date, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(iso, timezone, "EEE d MMM yyyy", { locale: es });
}

export function formatDateTime(
  iso: string | Date,
  timezone = DEFAULT_TIMEZONE,
): string {
  return formatInTimeZone(iso, timezone, "EEEE d 'de' MMMM 'de' yyyy, HH:mm 'hrs'", {
    locale: es,
  });
}

export function formatRange(
  startIso: string,
  endIso: string,
  timezone = DEFAULT_TIMEZONE,
): string {
  const start = formatInTimeZone(startIso, timezone, "HH:mm", { locale: es });
  const end = formatInTimeZone(endIso, timezone, "HH:mm", { locale: es });
  return `${start} – ${end} hrs`;
}

/** "2026-10-05" a partir de un instante, en la zona de la clínica. */
export function dateKey(iso: string | Date, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(iso, timezone, "yyyy-MM-dd");
}

/** ISO con offset de la zona: "2026-10-05T09:00:00-03:00" */
export function zonedInstant(
  day: string,
  time: string,
  timezone = DEFAULT_TIMEZONE,
): string {
  return fromZonedTime(`${day}T${time}:00`, timezone).toISOString();
}

/** Etiqueta corta para chips de filtro: "Lun 5 oct". */
export function formatDayChip(day: string, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(zonedInstant(day, "12:00", timezone), timezone, "EEE d MMM", {
    locale: es,
  });
}

/**
 * Type guard: además de validar, permite que TypeScript estreche el tipo
 * (útil cuando el valor viene de `searchParams` y es `string | undefined`).
 */
export function isValidDayKey(day: string | undefined | null): day is string {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const parsed = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && dateKey(parsed, "UTC") === day;
}

export function todayKey(timezone = DEFAULT_TIMEZONE): string {
  return dateKey(new Date(), timezone);
}

export function addDaysToKey(day: string, days: number): string {
  const base = new Date(`${day}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function weekdayOfKey(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

export function durationMinutes(startIso: string, endIso: string): number {
  return Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000,
  );
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}