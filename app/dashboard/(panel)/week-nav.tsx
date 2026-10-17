"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { addDaysToKey, weekRange } from "@/lib/dates";

/**
 * Navegación por semana de la agenda.
 *
 * Igual que `DayNav`, va por la URL (`?view=semana&date=<lunes>`): la semana se
 * puede compartir, recargar y el botón atrás del navegador funciona. Clona los
 * search params para conservar el filtro de profesional.
 */
export function WeekNav({ dayKey, today }: { dayKey: string; today: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const semana = weekRange(dayKey);
  const esEstaSemana = semana.from === weekRange(today).from;

  function irA(day: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "semana");
    params.set("date", weekRange(day).from);

    startTransition(() => {
      router.push(`/dashboard${params.size ? `?${params}` : ""}`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <button
        type="button"
        onClick={() => irA(addDaysToKey(semana.from, -7))}
        disabled={pending}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm transition-colors hover:border-brand-navy-300 hover:text-brand-navy disabled:opacity-60"
        aria-label="Semana anterior"
      >
        ←
      </button>

      <div>
        <label htmlFor="filtro-dia" className="mb-1 block text-xs font-medium text-neutral-600">
          Semana del
        </label>
        <input
          id="filtro-dia"
          type="date"
          value={semana.from}
          disabled={pending}
          onChange={(e) => {
            if (e.target.value) irA(e.target.value);
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm transition-colors hover:border-brand-navy-300 disabled:opacity-60"
        />
      </div>

      <button
        type="button"
        onClick={() => irA(addDaysToKey(semana.from, 7))}
        disabled={pending}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm transition-colors hover:border-brand-navy-300 hover:text-brand-navy disabled:opacity-60"
        aria-label="Semana siguiente"
      >
        →
      </button>

      {!esEstaSemana ? (
        <button
          type="button"
          onClick={() => irA(today)}
          disabled={pending}
          className="rounded-lg border border-brand-navy px-3 py-2 text-sm font-medium text-brand-navy hover:bg-brand-navy/5 disabled:opacity-60"
        >
          Hoy
        </button>
      ) : null}
    </div>
  );
}