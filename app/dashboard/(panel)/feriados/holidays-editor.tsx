"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNotice, InfoNotice, inputClasses } from "@/components/ui";

export interface Holiday {
  date: string;
  name: string | null;
}

function diaLegible(key: string): string {
  const d = new Date(`${key}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })
    .format(d)
    .replace(/\./g, "");
}

/** Los feriados: días que la oficina entera no atiende. */
export function HolidaysEditor({ initial }: { initial: Holiday[] }) {
  const router = useRouter();

  const [holidays, setHolidays] = useState<Holiday[]>(() =>
    [...initial].sort((a, b) => a.date.localeCompare(b.date)),
  );
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);

  async function crear() {
    setError(null);
    setAviso(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Elige una fecha");
      return;
    }
    if (name.trim().length < 2) {
      setError("Indica el nombre del feriado");
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch("/api/dashboard/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, name: name.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        holiday?: Holiday;
      };

      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el feriado");
        return;
      }

      if (data.holiday) {
        setHolidays((prev) =>
          [...prev, data.holiday!].sort((a, b) => a.date.localeCompare(b.date)),
        );
      }
      setAviso("Feriado guardado: ese día no se ofrecerán horas.");
      setDate("");
      setName("");
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(dia: string) {
    setEliminando(dia);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/holidays", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dia }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "No se pudo eliminar el feriado");
        return;
      }
      setHolidays((prev) => prev.filter((h) => h.date !== dia));
      setAviso("Feriado eliminado: ese día vuelve a ofrecer horas.");
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setEliminando(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorNotice message={error} /> : null}
      {aviso ? <InfoNotice>{aviso}</InfoNotice> : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-4" aria-label="Nuevo feriado">
        <h2 className="font-semibold text-neutral-900">Agregar feriado</h2>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Fecha</span>
            <input type="date" className={inputClasses} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Nombre</span>
            <input
              type="text"
              className={inputClasses}
              value={name}
              placeholder="P. ej. Fiestas patrias"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4">
          <Button onClick={crear} disabled={guardando}>
            {guardando ? "Guardando…" : "Agregar feriado"}
          </Button>
        </div>
      </section>

      <section aria-labelledby="lista-feriados">
        <h2 id="lista-feriados" className="font-semibold text-neutral-900">
          Feriados actuales
        </h2>
        {holidays.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Todavía no hay feriados registrados.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {holidays.map((h) => (
              <li
                key={h.date}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-neutral-900 capitalize">{diaLegible(h.date)}</p>
                  <p className="text-sm text-neutral-600">{h.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => eliminar(h.date)}
                  disabled={eliminando === h.date}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-60"
                >
                  {eliminando === h.date ? "Eliminando…" : "Eliminar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <InfoNotice>
        Los feriados afectan a reservas nuevas: una cita que ya estaba agendada ese día sigue en
        pie.
      </InfoNotice>
    </div>
  );
}