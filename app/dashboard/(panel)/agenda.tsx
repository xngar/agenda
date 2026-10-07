"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { DoctorAppointment } from "@/lib/types";
import { formatTime } from "@/lib/dates";
import { StatusBadge, EmptyState } from "@/components/ui";
import { useRealtimeNotifications } from "../use-realtime";
import { parseAppointmentRange } from "@/lib/range";

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
 * Al llegar una notificación por Realtime se hace `router.refresh()`, que
 * vuelve a pedir la agenda al servidor. Se prefiere eso a mutar la lista
 * en el cliente: la fuente de verdad es el servidor, y el refresco
 * también trae cambios hechos por otro profesional.
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
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevas, setNuevas] = useState(0);

  const { connected, error: realtimeError } = useRealtimeNotifications(
    doctorId,
    useCallback(() => {
      setNuevas((n) => n + 1);
    }, []),
  );

  async function cambiar(appointmentId: string, action: string) {
    setError(null);
    setPendiente(appointmentId + action);

    try {
      const response = await fetch("/api/dashboard/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, action }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "No se pudo actualizar la cita");
        return;
      }

      setNuevas(0);
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setPendiente(null);
    }
  }

  const visibles = initial.filter((a) => {
    if (filtro === "activas") return a.status !== "cancelled";
    if (filtro === "canceladas") return a.status === "cancelled";
    return true;
  });

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
              {valor}
            </button>
          ))}
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

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {visibles.length === 0 ? (
        diasConCitas.length > 0 ? (
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
        <ul className="space-y-2">
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
      )}

      <p className="sr-only" aria-live="polite">
        {pendiente ? "Actualizando cita" : ""}
      </p>
    </section>
  );
}

/**
 * Riel y fondo por estado. Misma historia de color que `CHIP_TONO` en
 * month-view (navy = confirmada, celeste = por confirmar, gris = cancelada)
 * para que día y mes se lean como la misma agenda.
 */
const RIEL: Record<string, string> = {
  confirmed: "border-l-brand-navy bg-white",
  pending: "border-l-brand-sky-400 bg-brand-sky-50",
  cancelled: "border-l-neutral-300 bg-white",
  completed: "border-l-brand-navy-300 bg-white",
  no_show: "border-l-red-400 bg-white",
};

function Accion({
  etiqueta,
  onClick,
  disabled,
  tono,
  destacado,
}: {
  etiqueta: string;
  onClick: () => void;
  disabled?: boolean;
  tono?: "peligro";
  destacado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        destacado
          ? "border-brand-navy bg-brand-navy text-white hover:bg-brand-navy/90"
          : tono === "peligro"
            ? "border-red-300 text-red-700 hover:bg-red-50"
            : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      {etiqueta}
    </button>
  );
}