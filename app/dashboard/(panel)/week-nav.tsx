"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
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
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => irA(addDaysToKey(semana.from, -7))}
          disabled={pending}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-brand-navy disabled:pointer-events-none disabled:opacity-50"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <label htmlFor="filtro-dia" className="sr-only">
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
          className="h-9 rounded-lg border-0 bg-transparent px-2 text-sm text-neutral-800 transition-colors hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-sky/40 disabled:opacity-50"
        />

        <button
          type="button"
          onClick={() => irA(addDaysToKey(semana.from, 7))}
          disabled={pending}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-brand-navy disabled:pointer-events-none disabled:opacity-50"
          aria-label="Semana siguiente"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {!esEstaSemana ? (
        <button
          type="button"
          onClick={() => irA(today)}
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-xl border border-brand-navy bg-white px-3 text-sm font-semibold text-brand-navy transition-[color,background-color,border-color,box-shadow,transform] duration-micro ease-out-soft hover:bg-brand-navy hover:text-white hover:shadow-xs active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          Hoy
        </button>
      ) : null}
    </div>
  );
}
