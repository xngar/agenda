"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNotice, InfoNotice, inputClasses } from "@/components/ui";
import {
  availabilityOverlaps,
  availabilityOverlapMessage,
  availabilityRulesSchema,
} from "@/lib/validation";

export interface AvailabilityRule {
  id?: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

interface Franja extends AvailabilityRule {
  /** Id local para React; la base genera los suyos al guardar. */
  key: number;
}

interface Conflicto {
  id: string;
  dia: string;
  hora: string;
}

/** En orden de calendario, empezando por lunes (Postgres: 0 = domingo). */
const DIAS = [
  { d: 1, nombre: "Lunes" },
  { d: 2, nombre: "Martes" },
  { d: 3, nombre: "Miércoles" },
  { d: 4, nombre: "Jueves" },
  { d: 5, nombre: "Viernes" },
  { d: 6, nombre: "Sábado" },
  { d: 0, nombre: "Domingo" },
];

/**
 * `09:00:00` → `09:00`; `9:00` → `09:00`. El esquema exige dos dígitos.
 *
 * Acepta `undefined` a propósito: un valor malo del servidor no debe tumbar
 * el render de toda la página, sólo el input que lo usa.
 */
function normalizar(hhmm: string | undefined): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":");
  if (h === undefined || m === undefined) return hhmm;
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function minutos(hhmm: string | undefined): number | null {
  if (!hhmm) return null;
  const [h, m] = normalizar(hhmm).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function hhmm(total: number): string {
  const t = Math.min(total, 23 * 60 + 59);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/**
 * Editor del horario semanal.
 *
 * El formulario manda el horario COMPLETO y el servidor lo reemplaza en una
 * sola transacción (migración 0014). No se edita fila por fila: lo que el
 * usuario piensa es "el martes atiendo por la tarde", y un reemplazo
 * completo no deja horarios a medio escribir si algo falla.
 *
 * Al guardar se avisa si hay citas que quedarían fuera del nuevo horario.
 * Cambiar horario no reagenda nada: sólo decide qué horas se ofrecen desde
 * ahora.
 */
export function ScheduleEditor({
  doctorId,
  isAdmin,
  initial,
}: {
  doctorId: string;
  isAdmin: boolean;
  initial: AvailabilityRule[];
}) {
  const router = useRouter();

  const [franjas, setFranjas] = useState<Franja[]>(() =>
    initial.map((r, i) => ({ ...r, key: i })),
  );
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [conflictos, setConflictos] = useState<Conflicto[] | null>(null);
  const [guardando, setGuardando] = useState(false);

  function ordenadas(d: number): Franja[] {
    return franjas
      .filter((f) => f.weekday === d)
      .sort((a, b) => normalizar(a.startTime).localeCompare(normalizar(b.startTime)));
  }

  function actualizar(key: number, campo: "startTime" | "endTime", valor: string) {
    setFranjas((prev) => prev.map((f) => (f.key === key ? { ...f, [campo]: valor } : f)));
    setAviso(null);
  }

  function agregar(d: number) {
    const delDia = ordenadas(d);
    const ultima = delDia[delDia.length - 1];

    const inicio = ultima ? normalizar(ultima.endTime) : "09:00";
    const inicioMin = minutos(inicio);
    const fin = inicioMin === null ? "13:00" : hhmm(inicioMin + 120);
    const finMin = minutos(fin);

    if (inicioMin === null || finMin === null || finMin <= inicioMin) {
      setError("Ese día ya no tiene más horas libres");
      return;
    }

    setError(null);
    setFranjas((prev) => [
      ...prev,
      { key: Math.max(0, ...prev.map((f) => f.key)) + 1, weekday: d, startTime: inicio, endTime: fin },
    ]);
  }

  function quitar(key: number) {
    setFranjas((prev) => prev.filter((f) => f.key !== key));
    setAviso(null);
  }

  function resetear() {
    setFranjas(initial.map((r, i) => ({ ...r, key: i })));
    setError(null);
    setAviso(null);
    setConflictos(null);
  }

  async function guardar(confirmado = false) {
    setError(null);
    setAviso(null);
    setConflictos(null);

    const reglas = franjas.map((f) => ({
      weekday: f.weekday,
      startTime: normalizar(f.startTime),
      endTime: normalizar(f.endTime),
    }));

    const validado = availabilityRulesSchema.safeParse({ doctorId, rules: reglas });
    if (!validado.success) {
      setError(validado.error.issues[0]?.message ?? "Revisa las horas");
      return;
    }
    if (availabilityOverlaps(reglas)) {
      setError(availabilityOverlapMessage);
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch("/api/dashboard/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, rules: reglas, confirm: confirmado }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        conflicts?: Conflicto[];
        rules?: AvailabilityRule[];
      };

      if (response.status === 409 && data.conflicts) {
        setConflictos(data.conflicts);
        return;
      }

      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el horario");
        return;
      }

      if (data.rules) {
        setFranjas(data.rules.map((r, i) => ({ ...r, key: i })));
      }

      setAviso(
        data.conflicts && data.conflicts.length > 0
          ? `Horario guardado. ${data.conflicts.length} cita${data.conflicts.length === 1 ? "" : "s"} quedó${data.conflicts.length === 1 ? "" : "n"} fuera del horario; no se movieron.`
          : "Horario guardado.",
      );
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const total = franjas.length;
  const cerrados = DIAS.filter((d) => ordenadas(d.d).length === 0);

  return (
    <div className="space-y-4">
      {error ? <ErrorNotice message={error} /> : null}
      {aviso ? <InfoNotice>{aviso}</InfoNotice> : null}

      {conflictos ? (
        <div className="rounded-card border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">
            {conflictos.length} cita{conflictos.length === 1 ? "" : "s"} quedaría
            {conflictos.length === 1 ? "" : "n"} fuera del nuevo horario
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Guardar no las cancela ni las mueve: siguen agendadas. Quedan fuera porque el nuevo
            horario no ofrece esa hora.
          </p>
          <ul className="mt-3 max-h-40 overflow-y-auto text-sm text-amber-900">
            {conflictos.map((c) => (
              <li key={c.id}>
                {c.dia.split("-").reverse().join("/")} {c.hora}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button variant="danger" onClick={() => guardar(true)} disabled={guardando}>
              Guardar de todas formas
            </Button>
            <Button variant="secondary" onClick={() => setConflictos(null)} disabled={guardando}>
              Revisar
            </Button>
          </div>
        </div>
      ) : null}

      <p className="text-sm text-neutral-600">
        {total} franja{total === 1 ? "" : "s"} ·{" "}
        {cerrados.length === 7
          ? "ningún día atiende"
          : cerrados.length === 0
            ? "los 7 días abiertos"
            : `cerrado: ${cerrados.map((d) => d.nombre.toLowerCase()).join(", ")}`}
      </p>

      {total === 0 ? (
        <ErrorNotice
          title="Sin horario"
          message="Si guardas así, el profesional no ofrecerá ninguna hora en el asistente público. Los pacientes no podrán reservarle hasta que definas al menos una franja."
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {DIAS.map(({ d, nombre }) => {
          const delDia = ordenadas(d);

          return (
            <section
              key={d}
              className="rounded-2xl border border-neutral-200 bg-white p-4"
              aria-label={`Horario de ${nombre}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-neutral-900">{nombre}</h3>
                {delDia.length === 0 ? (
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">
                    Cerrado
                  </span>
                ) : (
                  <span className="text-xs text-neutral-500">
                    {delDia.length} franja{delDia.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {delDia.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    Sin horario: ese día no se ofrecen horas.
                  </p>
                ) : (
                  delDia.map((f) => (
                    <div key={f.key} className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`ini-${f.key}`}>
                        {nombre}: hora de inicio
                      </label>
                      <input
                        id={`ini-${f.key}`}
                        type="time"
                        value={f.startTime}
                        onChange={(e) => actualizar(f.key, "startTime", e.target.value)}
                        className={`${inputClasses} w-32`}
                      />
                      <span aria-hidden="true">–</span>
                      <label className="sr-only" htmlFor={`fin-${f.key}`}>
                        {nombre}: hora de término
                      </label>
                      <input
                        id={`fin-${f.key}`}
                        type="time"
                        value={f.endTime}
                        onChange={(e) => actualizar(f.key, "endTime", e.target.value)}
                        className={`${inputClasses} w-32`}
                      />
                      <button
                        type="button"
                        onClick={() => quitar(f.key)}
                        aria-label={`Quitar la franja de ${nombre}`}
                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}

                <button
                  type="button"
                  onClick={() => agregar(d)}
                  className="rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:border-brand-navy hover:text-brand-navy"
                >
                  + Franja
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <InfoNotice>
        Los cambios sólo afectan a reservas nuevas. Las citas ya agendadas no se mueven ni se
        cancelan.
      </InfoNotice>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => guardar(false)} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar horario"}
        </Button>
        <Button variant="secondary" onClick={resetear} disabled={guardando}>
          Descartar cambios
        </Button>

        {isAdmin ? (
          <span className="self-center text-xs text-neutral-500">
            Al guardar se reemplaza todo el horario del profesional.
          </span>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {guardando ? "Guardando horario" : ""}
      </p>
    </div>
  );
}