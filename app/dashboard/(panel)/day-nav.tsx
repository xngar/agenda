"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/**
 * Navegación por día de la agenda.
 *
 * Va por la URL (`?date=`) igual que el filtro de profesional, para que el
 * día se pueda recargar, compartir y conservar al refrescar por Realtime.
 *
 * Antes no existía nada de esto: la agenda abría siempre en hoy y, si el
 * paciente había reservado para otro día, el profesional veía una lista
 * vacía sin ninguna pista de dónde estaba la cita.
 */

function mover(dia: string, delta: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  f.setUTCDate(f.getUTCDate() + delta);
  return f.toISOString().slice(0, 10);
}

export function DayNav({
  dayKey,
  today,
  resumen,
}: {
  dayKey: string;
  today: string;
  /** Días con citas, para poder saltar a ellos desde un día vacío. */
  resumen: { day: string; total: number; pendientes: number }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function irA(day: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (day === today) params.delete("date");
    else params.set("date", day);

    startTransition(() => {
      router.push(`/dashboard${params.size ? `?${params}` : ""}`);
    });
  }

  const esHoy = dayKey === today;
  // Días con citas hacia adelante, que es lo que ayuda cuando el día
  // escolhido está vacío.
  const siguientes = resumen.filter((r) => r.day > dayKey).slice(0, 3);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => irA(mover(dayKey, -1))}
          disabled={pending}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-brand-navy disabled:pointer-events-none disabled:opacity-50"
          aria-label="Día anterior"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <label htmlFor="filtro-dia" className="sr-only">
          Día
        </label>
        <input
          id="filtro-dia"
          type="date"
          value={dayKey}
          disabled={pending}
          onChange={(e) => {
            if (e.target.value) irA(e.target.value);
          }}
          className="h-9 rounded-lg border-0 bg-transparent px-2 text-sm text-neutral-800 transition-colors hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-sky/40 disabled:opacity-50"
        />

        <button
          type="button"
          onClick={() => irA(mover(dayKey, 1))}
          disabled={pending}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-brand-navy disabled:pointer-events-none disabled:opacity-50"
          aria-label="Día siguiente"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {!esHoy ? (
        <button
          type="button"
          onClick={() => irA(today)}
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-xl border border-brand-navy bg-white px-3 text-sm font-semibold text-brand-navy transition-all duration-150 ease-out hover:bg-brand-navy hover:text-white hover:shadow-xs active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          Hoy
        </button>
      ) : null}

      {siguientes.length > 0 ? (
        <nav aria-label="Días con citas" className="flex flex-wrap items-center gap-1">
          {siguientes.map((r) => (
            <button
              key={r.day}
              type="button"
              onClick={() => irA(r.day)}
              disabled={pending}
              className="inline-flex min-h-9 items-center rounded-full border border-neutral-300 bg-white px-3 text-xs font-medium transition-all duration-150 ease-out hover:border-brand-navy hover:text-brand-navy hover:shadow-xs active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              {r.pendientes > 0
                ? `${r.day.slice(8)}/${r.day.slice(5, 7)} · ${r.pendientes} por confirmar`
                : `${r.day.slice(8)}/${r.day.slice(5, 7)} · ${r.total}`}
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}