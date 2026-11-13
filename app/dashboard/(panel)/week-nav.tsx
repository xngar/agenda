"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { addDaysToKey, weekRange } from "@/lib/dates";
import { DatePicker } from "@/components/ui/date-picker";

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
          className="group inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-all duration-micro hover:bg-action-primary/5 hover:text-action-primary active:scale-90 disabled:pointer-events-none disabled:opacity-50"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4 btn-icon-left" aria-hidden="true" />
        </button>

        <label htmlFor="filtro-semana" className="sr-only">
          Semana del
        </label>
        <DatePicker
          id="filtro-semana"
          value={semana.from}
          disabled={pending}
          onChange={irA}
        />

        <button
          type="button"
          onClick={() => irA(addDaysToKey(semana.from, 7))}
          disabled={pending}
          className="group inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-all duration-micro hover:bg-action-primary/5 hover:text-action-primary active:scale-90 disabled:pointer-events-none disabled:opacity-50"
          aria-label="Semana siguiente"
        >
          <ChevronRight className="h-4 w-4 btn-icon-right" aria-hidden="true" />
        </button>
      </div>

      {!esEstaSemana ? (
        <button
          type="button"
          onClick={() => irA(today)}
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-xl border border-action-primary bg-white px-3 text-sm font-semibold text-action-primary transition-[color,background-color,border-color,box-shadow,transform] duration-micro ease-out-soft hover:bg-action-primary/10 hover:shadow-xs active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          Hoy
        </button>
      ) : null}
    </div>
  );
}
