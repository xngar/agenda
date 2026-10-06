"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNotice, InfoNotice, inputClasses } from "@/components/ui";
import { addDaysToKey, dateKey, isValidDayKey, zonedInstant } from "@/lib/dates";

export interface BlockedRange {
  id: string;
  dia: string;
  desde: string;
  hasta: string;
  cruzaMedianoche: boolean;
  motivos: string | null;
}

interface Conflicto {
  id: string;
  dia: string;
  hora: string;
}

/** `9:00` → `09:00`. Demo mal hecha para captar el error temprano. */
function normalizar(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  if (h === undefined || m === undefined) return hhmm;
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function diaLegible(key: string): string {
  const d = new Date(`${key}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(d)
    .replace(/\./g, "");
}

/**
 * Formulario de bloqueos.
 *
 * Las horas se escriben en la hora de la clínica y se guardan como
 * instantes UTC (`during` de `time_off` es `tstzrange`). Un bloqueo que
 * "termina más tarde de lo que empieza" se entiende como algo que cruza la
 * medianoche: el motivo que importa es la *ausencia*, no el día.
 *
 * Lo que NO hace el formulario: avisar "estás borrando esta hora". Un
 * bloqueo no borra citas. Las citas que coincidan con el bloqueo se llenan
 * antes de guardar, con confirmación en pantalla.
 */
export function TimeOffEditor({
  doctorId,
  initial,
  timezone,
}: {
  doctorId: string;
  initial: BlockedRange[];
  timezone: string;
}) {
  const router = useRouter();

  const [blocks, setBlocks] = useState<BlockedRange[]>(() =>
    [...initial].sort((a, b) => `${a.dia} ${a.desde}`.localeCompare(`${b.dia} ${b.desde}`)),
  );
  const [dia, setDia] = useState(() => dateKey(new Date(), timezone));
  const [desde, setDesde] = useState("12:30");
  const [hasta, setHasta] = useState("14:30");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [conflictos, setConflictos] = useState<Conflicto[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);

  async function crear(confirmado = false) {
    setError(null);
    setAviso(null);
    setConflictos(null);

    const desdeOk = normalizar(desde);
    const hastaOk = normalizar(hasta);
    const horaValida = /^\d{2}:\d{2}$/.test(desdeOk) && /^\d{2}:\d{2}$/.test(hastaOk);

    if (!isValidDayKey(dia)) {
      setError("Elige una fecha válida");
      return;
    }
    if (!horaValida) {
      setError("Las horas van como 09:00 o 17:30");
      return;
    }
    if (desdeOk === hastaOk) {
      setError("El bloqueo dura al menos un minuto");
      return;
    }

    const cruza = hastaOk < desdeOk;
    const diaHasta = cruza ? addDaysToKey(dia, 1) : dia;
    const startsAt = zonedInstant(dia, desdeOk, timezone);
    const endsAt = zonedInstant(diaHasta, hastaOk, timezone);

    setGuardando(true);
    try {
      const response = await fetch("/api/dashboard/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          startsAt,
          endsAt,
          reason: motivo.trim() || undefined,
          confirm: confirmado,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        block?: BlockedRange;
        conflicts?: Conflicto[];
        warnings?: number;
      };

      if (response.status === 409 && data.conflicts) {
        setConflictos(data.conflicts);
        return;
      }
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el bloqueo");
        return;
      }

      if (data.block) {
        const nuevo: BlockedRange = {
          id: String(data.block.id),
          dia,
          desde: desdeOk,
          hasta: hastaOk,
          cruzaMedianoche: cruza,
          motivos: motivo.trim() || null,
        };
        setBlocks((prev) =>
          [...prev, nuevo].sort((a, b) => `${a.dia} ${a.desde}`.localeCompare(`${b.dia} ${b.desde}`)),
        );
      }

      setAviso(
        (data.warnings ?? 0) > 0
          ? `Bloqueo guardado. ${data.warnings} cita${data.warnings === 1 ? "" : "s"} quedó${data.warnings === 1 ? "" : "n"} dentro; no se movieron ni cancelaron.`
          : "Bloqueo guardado.",
      );
      setMotivo("");
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    setEliminando(id);
    try {
      const response = await fetch("/api/dashboard/time-off", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "No se pudo eliminar el bloqueo");
        return;
      }
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      setAviso("Bloqueo eliminado: esas horas vuelven a ofrecerse.");
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

      <section className="rounded-2xl border border-neutral-200 bg-white p-4" aria-label="Nuevo bloqueo">
        <h2 className="font-semibold text-neutral-900">Bloquear un rango</h2>

        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Fecha</span>
            <input type="date" className={inputClasses} value={dia} onChange={(e) => setDia(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Desde</span>
            <input type="time" className={inputClasses} value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Hasta</span>
            <input type="time" className={inputClasses} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Motivo (opcional)</span>
            <input
              type="text"
              className={inputClasses}
              value={motivo}
              placeholder="Vacaciones, colación…"
              onChange={(e) => setMotivo(e.target.value)}
            />
          </label>
        </div>

        {hasta < desde ? (
          <InfoNotice>El bloqueo termina al día siguiente: la hora de término es anterior al inicio.</InfoNotice>
        ) : null}

        {conflictos ? (
          <div className="mt-3 rounded-card border border-amber-300 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">
              {conflictos.length} cita{conflictos.length === 1 ? "" : "s"} quedaría
              {conflictos.length === 1 ? "" : "n"} dentro de ese rango
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Bloquear no las cancela ni las mueve: siguen agendadas, pero esa hora deja de
              ofrecerse a reservas nuevas.
            </p>
            <ul className="mt-3 max-h-40 overflow-y-auto text-sm text-amber-900">
              {conflictos.map((c) => (
                <li key={c.id}>
                  {c.dia.split("-").reverse().join("/")} {c.hora}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button variant="danger" onClick={() => crear(true)} disabled={guardando}>
                Bloquear de todas formas
              </Button>
              <Button variant="secondary" onClick={() => setConflictos(null)} disabled={guardando}>
                Revisar
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <Button onClick={() => crear(false)} disabled={guardando}>
            {guardando ? "Guardando…" : "Bloquear"}
          </Button>
        </div>
      </section>

      <section aria-labelledby="lista-bloqueos">
        <h2 id="lista-bloqueos" className="font-semibold text-neutral-900">
          Bloqueos actuales
        </h2>
        {blocks.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">
            No hay bloqueos: se ofrecen todas las horas del horario.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {blocks.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-neutral-900">
                    {diaLegible(b.dia)} · {b.desde}–{b.hasta}
                    {b.cruzaMedianoche ? <span className="text-neutral-500"> (día siguiente)</span> : null}
                  </p>
                  {b.motivos ? <p className="text-sm text-neutral-600">{b.motivos}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => eliminar(b.id)}
                  disabled={eliminando === b.id}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-60"
                >
                  {eliminando === b.id ? "Eliminando…" : "Eliminar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <InfoNotice>
        Los bloqueos sólo afectan a reservas nuevas: las citas ya agendadas no se mueven ni se
        cancelan.
      </InfoNotice>
    </div>
  );
}