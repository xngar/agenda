"use client";

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
    <div className="flex flex-wrap items-end gap-2">
      <button
        type="button"
        onClick={() => irA(mover(dayKey, -1))}
        disabled={pending}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-100 disabled:opacity-60"
        aria-label="Día anterior"
      >
        ←
      </button>

      <div>
        <label
          htmlFor="filtro-dia"
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
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
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
        />
      </div>

      <button
        type="button"
        onClick={() => irA(mover(dayKey, 1))}
        disabled={pending}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-100 disabled:opacity-60"
        aria-label="Día siguiente"
      >
        →
      </button>

      {!esHoy ? (
        <button
          type="button"
          onClick={() => irA(today)}
          disabled={pending}
          className="rounded-lg border border-brand-navy px-3 py-2 text-sm font-medium text-brand-navy hover:bg-brand-navy/5 disabled:opacity-60"
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
              className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-60"
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