"use client";

import { useMemo, useRef } from "react";
import type { Holiday } from "@/lib/types";
import {
  DEFAULT_TIMEZONE as TZ,
  addDaysToKey,
  todayKey,
  weekdayOfKey,
} from "@/lib/dates";

export interface DayStatus {
  available: boolean;
  reason?: string;
  loading?: boolean;
}

interface Props {
  holidays: Holiday[];
  maxDaysAhead: number;
  minNoticeHours: number;
  selected: string | null;
  statuses: Record<string, DayStatus>;
  onSelect: (dayKey: string) => void;
}

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * Calendario de dos semanas.
 *
 * Se disable por regla conocida en el cliente (domingo, feriado, fuera de
 * rango) para dar feedback inmediato, pero el día habilitado NO implica
 * disponibilidad: las horas llegan del servidor al elegir el día. La
 * verdad es siempre Postgres.
 *
 * La grilla se alinea a la semana real (lunes→domingo): antes de hoy se
 * muestran atenuados los días pasados de la semana y al final se completan
 * las filas vacías, porque el encabezado `Lu…Do` fija la columna de cada
 * número. Empezar "desde hoy" en la primera columna hacía que el 7 de
 * octubre cayera bajo "Lu" cuando era miércoles.
 */
export default function WeekdayPicker({
  holidays,
  maxDaysAhead,
  minNoticeHours,
  selected,
  statuses,
  onSelect,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);

  const holidayMap = useMemo(
    () => new Map(holidays.map((h) => [h.date, h.name])),
    [holidays],
  );

  const today = useMemo(() => todayKey(TZ), []);

  /** Días pasados de la semana de hoy, para alinear la primera fila. */
  const pasados = useMemo(() => {
    const n = weekdayForGrid(today); // 0 = lunes
    const list: DayCell[] = [];
    for (let k = n; k >= 1; k--) {
      const key = addDaysToKey(today, -k);
      list.push({
        key,
        dayNumber: Number(key.slice(8, 10)),
        weekday: weekdayForGrid(key),
        disabled: true,
        reason: "Día pasado",
        past: true,
      });
    }
    return list;
  }, [today]);

  const days = useMemo(() => {
    const now = new Date();
    const minutesNow = minutesInSantiago(now);
    const minNoticeMinutes = minNoticeHours * 60;
    const todayIsUsable = minutesNow + minNoticeMinutes < 24 * 60;

    const list: DayCell[] = [];
    for (let i = 0; i < 14; i++) {
      // Los días se cuentan sobre la clave de Santiago, no con
      // `setDate()` sobre la hora local del navegador: sumarlos en la zona
      // del paciente mezcla dos calendarios y alguien en UTC+10 vería el
      // lunes donde la clínica todavía es domingo.
      const key = addDaysToKey(today, i);
      const weekday = weekdayForGrid(key); // 0 = lunes

      const isSunday = weekday === 6;
      const holiday = holidayMap.get(key);
      const outOfRange = i > maxDaysAhead;
      const passedToday = i === 0 && !todayIsUsable;

      let reason: string | null = null;
      if (isSunday) reason = "Cerrado los domingos";
      else if (holiday) reason = holiday;
      else if (outOfRange) reason = "Fuera del período de reservas";
      else if (passedToday) reason = `Necesitas avisar con ${minNoticeHours} h de anticipación`;

      const status = statuses[key];

      list.push({
        key,
        dayNumber: Number(key.slice(8, 10)),
        weekday,
        disabled: reason !== null || status?.available === false,
        reason: reason ?? status?.reason ?? null,
        loading: status?.loading,
      });
    }
    return list;
  }, [today, holidayMap, maxDaysAhead, minNoticeHours, statuses]);

  const celdas = useMemo(() => [...pasados, ...days], [pasados, days]);

  /** Relleno final para que la grilla cierre en filas completas de 7. */
  const relleno = useMemo(() => {
    const resto = celdas.length % 7;
    return resto === 0 ? 0 : 7 - resto;
  }, [celdas.length]);

  const monthLabel = useMemo(() => {
    if (celdas.length === 0) return "";
    const desde = Number(celdas[0]!.key.slice(5, 7)) - 1;
    const hasta = Number(celdas[celdas.length - 1]!.key.slice(5, 7)) - 1;
    return desde === hasta ? MONTHS[desde] : `${MONTHS[desde]} – ${MONTHS[hasta]}`;
  }, [celdas]);

  return (
    <section aria-labelledby="calendario-titulo">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="calendario-titulo" className="text-sm font-medium text-neutral-800">
          Días disponibles
        </h3>
        <p className="text-xs capitalize text-neutral-600">{monthLabel}</p>
      </div>

      <div
        ref={gridRef}
        role="group"
        aria-label="Calendario de reservas de los próximos 14 días"
        className="mt-2.5 grid grid-cols-7 gap-1.5 sm:gap-2"
      >
        {WEEKDAYS.map((label) => (
          <div key={label} className="pb-1 text-center text-xs font-semibold text-neutral-600">
            {label}
          </div>
        ))}

        {celdas.map((cell) => {
          const isSelected = selected === cell.key;
          const isToday = cell.key === today;
          const holiday = holidayMap.get(cell.key);

          return (
            <button
              key={cell.key}
              type="button"
              disabled={cell.disabled}
              onClick={() => onSelect(cell.key)}
              aria-pressed={isSelected}
              aria-label={describeDay(cell.key, holiday ?? null, cell.disabled)}
              title={cell.reason ?? undefined}
              className={[
                "relative flex min-h-14 flex-col items-center justify-center rounded-xl border text-sm transition-colors sm:min-h-16",
                cell.past
                  ? "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300"
                  : cell.disabled
                    ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400 line-through"
                    : "border-neutral-300 bg-white text-neutral-800 hover:border-brand-navy hover:bg-brand-navy-50",
                isSelected ? "border-brand-navy bg-brand-navy text-white hover:bg-brand-navy" : "",
                isToday && !isSelected ? "border-brand-sky bg-brand-sky-50" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="text-xs font-medium sm:text-sm">{cell.dayNumber}</span>
              {holiday && !cell.past ? (
                <span className="mt-0.5 hidden max-w-full truncate px-1 text-[9px] font-semibold uppercase leading-tight sm:block">
                  feriado
                </span>
              ) : null}
            </button>
          );
        })}

        {Array.from({ length: relleno }, (_, i) => (
          <div key={`relleno-${i}`} aria-hidden className="min-h-14 sm:min-h-16" />
        ))}
      </div>

      <p className="mt-2.5 text-xs text-neutral-600">
        Los días grises ya pasaron. Los días con línea son domingos, feriados o no tienen horas.
        Al elegir un día te mostramos las horas reales.
      </p>
    </section>
  );
}

interface DayCell {
  key: string;
  dayNumber: number;
  weekday: number;
  disabled: boolean;
  reason: string | null;
  loading?: boolean;
  past?: boolean;
}

/**
 * "Hoy" según el reloj de la clínica, no el del navegador. Es la misma
 * regla que usa el servidor en `/api/slots`; si divergieran, el paciente
 * vería habilitado un día que la clínica no tiene, o al revés.
 */
function minutesInSantiago(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);

  const read = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  // midnight puede venir como 24 con hour12:false.
  return (read("hour") % 24) * 60 + read("minute");
}

/**
 * 0 = lunes … 6 = domingo, que es como se ordena la grilla.
 *
 * OJO: `weekdayOfKey` de lib/dates devuelve la convención de Postgres
 * (0 = domingo). Se convierte explícitamente para no mezclar las dos.
 */
function weekdayForGrid(key: string): number {
  return (weekdayOfKey(key) + 6) % 7;
}

function describeDay(key: string, holiday: string | null, disabled: boolean): string {
  const label = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${key}T12:00:00Z`));

  if (holiday) return `${label}, feriado por ${holiday}, no disponible`;
  if (disabled) return `${label}, no disponible`;
  return `${label}, disponible`;
}
