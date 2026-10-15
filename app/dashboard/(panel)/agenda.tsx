"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DoctorAppointment } from "@/lib/types";
import { formatTime } from "@/lib/dates";
import { StatusBadge, EmptyState } from "@/components/ui";
import { useRealtimeNotifications } from "../use-realtime";
import { parseAppointmentRange } from "@/lib/range";
import { Accion, AgendaTable, RIEL } from "./agenda-table";

interface Props {
  initial: DoctorAppointment[];
  dayKey: string;
  doctorId: string;
  unreadCount: number;
  /** Días cercanos que sí tienen citas, para explicar un día vacío. */
  diasConCitas: { day: string; total: number; pendientes: number }[];
}

type Filtro = "todas" | "activas" | "canceladas";

/**
 * Lista de citas del día con acciones de estado.
 *
 * Al llegar una notificación por Realtime se refresca la agenda
 * automáticamente (`router.refresh()` con debounce): la fuente de verdad
 * es el servidor, y el refresco también trae cambios hechos por otro
 * profesional o por el paciente (ej. reprogramaciones desde /cita/[token]).
 * El aviso manual queda como respaldo por si el refresco automático falla.
 */
export function Agenda({
  initial,
  dayKey,
  doctorId,
  unreadCount,
  diasConCitas,
}: Props) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [nuevas, setNuevas] = useState(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  const { connected, error: realtimeError } = useRealtimeNotifications(
    doctorId,
    useCallback(() => {
      setNuevas((n) => n + 1);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        router.refresh();
        setNuevas(0);
      }, 1500);
    }, [router]),
  );

  async function cambiar(appointmentId: string, action: string) {
    setPendiente(appointmentId + action);

    try {
      const response = await fetch("/api/dashboard/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, action }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? "No se pudo actualizar la cita");
        return;
      }

      setNuevas(0);
      toast.success("Cita actualizada");
      router.refresh();
    } catch {
      toast.error("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setPendiente(null);
    }
  }

  const conteos = useMemo(() => {
    let activas = 0;
    let canceladas = 0;
    for (const a of initial) {
      if (a.status === "cancelled") canceladas += 1;
      else activas += 1;
    }
    return { todas: initial.length, activas, canceladas };
  }, [initial]);

  const visibles = initial.filter((a) => {
    if (filtro === "activas" && a.status === "cancelled") return false;
    if (filtro === "canceladas" && a.status !== "cancelled") return false;
    const q = normalizar(busqueda);
    if (!q) return true;
    return normalizar(a.patient?.full_name ?? "").includes(q);
  });

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="group" aria-label="Filtrar citas">
            {(["todas", "activas", "canceladas"] as const).map((valor) => (
              <button
                key={valor}
                type="button"
                aria-pressed={filtro === valor}
                onClick={() => setFiltro(valor)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  filtro === valor
                    ? "bg-brand-navy text-white"
                    : "bg-white text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {valor}{" "}
                <span className="tabular-nums opacity-80">({conteos[valor]})</span>
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="agenda-busqueda" className="sr-only">
              Buscar por nombre de paciente
            </label>
            <input
              id="agenda-busqueda"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre…"
              autoComplete="off"
              className="min-h-9 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 placeholder:text-neutral-500 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-sky"
            />
          </div>
        </div>

        <p className="flex items-center gap-2 text-xs text-neutral-500">
          <span
            aria-hidden
            className={`inline-block size-2 rounded-full ${
              connected ? "bg-emerald-500" : realtimeError ? "bg-red-500" : "bg-neutral-300"
            }`}
          />
          {connected ? "En vivo" : realtimeError ? "Sin conexión en vivo" : "Conectando…"}
        </p>
      </div>

      {nuevas > 0 || unreadCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            setNuevas(0);
            router.refresh();
          }}
          className="w-full rounded-xl border border-brand-sky bg-brand-sky-50 px-4 py-2.5 text-sm font-medium text-brand-navy"
        >
          Hay cambios nuevos en la agenda · actualizar
        </button>
      ) : null}

      {busqueda.trim() ? (
        <p className="text-sm tabular-nums text-neutral-600" aria-live="polite">
          {visibles.length} de {conteos.todas} citas
        </p>
      ) : null}

      {visibles.length === 0 ? (
        initial.length > 0 ? (
          <EmptyState
            title="Sin resultados"
            description={
              busqueda.trim()
                ? `Ninguna cita coincide con “${busqueda.trim()}”. Prueba con otro nombre o limpia la búsqueda.`
                : "Ninguna cita coincide con este filtro."
            }
            action={
              busqueda.trim() ? (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  Limpiar búsqueda
                </button>
              ) : undefined
            }
          />
        ) : diasConCitas.length > 0 ? (
          /*
            Un día vacío sin más se lee como "no hay nada", pero casi siempre
            significa "no hay nada HOY". Como la cita pendiente suele estar al
            día siguiente, sesaysólo en qué días hay algo.
          */
          <EmptyState
            title="Sin citas para este día"
            description={`No hay horas reservadas el ${new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${dayKey}T12:00:00Z`))}. Hay citas en los próximos días: usa las fechas de arriba para verlas.`}
          />
        ) : (
          <EmptyState title="Sin citas para este día" description="No hay horas reservadas que mostrar." />
        )
      ) : (
        <>
          <div className="hidden md:block">
            <AgendaTable citas={visibles} pendiente={pendiente} onAccion={cambiar} />
          </div>

          <ul className="space-y-2 md:hidden" data-testid="agenda-cards">
          {visibles.map((cita, i) => {
            const { start, end } = parseAppointmentRange(cita.during);
            const cancelada = cita.status === "cancelled";
            const ocupado = pendiente?.startsWith(cita.id) ?? false;

            return (
              <li
                key={cita.id}
                style={{ animationDelay: `${Math.min(i, 8) * 24}ms` }}
                className={`anim-month-cell flex gap-3 rounded-2xl border border-l-[4px] p-4 transition-shadow hover:shadow-card sm:gap-4 ${
                  RIEL[cita.status] ?? "border-l-neutral-300 bg-white"
                } ${cancelada ? "opacity-70" : ""}`}
              >
                {/*
                  La hora es el ancla de la lectura: gutter tabular a la
                  izquierda, igual que la grilla mensual usa el riel de
                  color para contar el estado de un vistazo.
                */}
                <div className="w-14 shrink-0 pt-0.5 text-right sm:w-16">
                  <p className="text-base font-semibold tabular-nums text-brand-navy">
                    {formatTime(start)}
                  </p>
                  <p className="text-xs tabular-nums text-neutral-600">{formatTime(end)}</p>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-neutral-900">
                        {cita.patient?.full_name ?? "Paciente"}
                      </p>
                      {cita.service?.name ? (
                        <p className="mt-0.5 truncate text-sm text-neutral-600">
                          {cita.service.name}
                        </p>
                      ) : null}
                      <p className="mt-0.5 truncate text-xs text-neutral-600">
                        {[cita.patient?.rut, cita.patient?.phone, cita.patient?.email]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <StatusBadge status={cita.status} />
                  </div>

                  {cita.status === "cancelled" && cita.cancel_reason ? (
                    <p className="mt-2 text-sm text-neutral-500">
                      Motivo: {cita.cancel_reason}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {cancelada ? (
                      <Accion
                        etiqueta="Reabrir"
                        onClick={() => cambiar(cita.id, "reopen")}
                        disabled={ocupado}
                      />
                    ) : (
                      <>
                        {/*
                          Una cita recién creada queda en `pending`. Mientras
                          no se confirme, el paciente no tiene garantía de que
                          el espacio siga reservado para él, así que el botón
                          va primero cuando corresponde.
                        */}
                        {cita.status === "pending" ? (
                          <Accion
                            etiqueta="Confirmar"
                            onClick={() => cambiar(cita.id, "confirmed")}
                            disabled={ocupado}
                            destacado
                          />
                        ) : null}
                        <Accion
                          etiqueta="Completar"
                          onClick={() => cambiar(cita.id, "completed")}
                          disabled={ocupado}
                        />
                        <Accion
                          etiqueta="No asistió"
                          onClick={() => cambiar(cita.id, "no_show")}
                          disabled={ocupado}
                        />
                        <Accion
                          etiqueta="Cancelar"
                          onClick={() => cambiar(cita.id, "cancelled")}
                          disabled={ocupado}
                          tono="peligro"
                        />
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          </ul>
        </>
      )}

      <p className="sr-only" aria-live="polite">
        {pendiente ? "Actualizando cita" : ""}
      </p>
    </section>
  );
}

function normalizar(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}