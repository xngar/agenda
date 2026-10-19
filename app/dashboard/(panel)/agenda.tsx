"use client";

import { useMemo, useState } from "react";
import type { DoctorAppointment } from "@/lib/types";
import { EmptyState } from "@/components/ui";
import { AgendaTable } from "./agenda-table";
import { AgendaCards } from "./agenda-cards";
import { useAgendaAcciones } from "./agenda-actions";
import { StaffRescheduleModal } from "./staff-reschedule-modal";
import type { StaffDoctor } from "./staff-booking-button";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  initial: DoctorAppointment[];
  dayKey: string;
  doctorId: string;
  unreadCount: number;
  /** Días cercanos que sí tienen citas, para explicar un día vacío. */
  diasConCitas: { day: string; total: number; pendientes: number }[];
  /** Profesionales entre los que el rol puede elegir al reagendar. */
  doctors: StaffDoctor[];
  /** Nombre de la clínica, para el mensaje de WhatsApp. */
  orgName: string;
}

type Filtro = "todas" | "activas" | "canceladas";

/**
 * Lista de citas del día con acciones de estado.
 *
 * La lógica de confirmar/cancelar/reprogramar y el refresco por Realtime viven
 * en `useAgendaAcciones`, que la vista semanal también usa: la fuente de verdad
 * es el servidor, y el refresco también trae cambios hechos por otro
 * profesional o por el paciente (ej. reprogramaciones desde /cita/[token]).
 */
export function Agenda({
  initial,
  dayKey,
  doctorId,
  unreadCount,
  diasConCitas,
  doctors,
  orgName,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");

  const {
    pendiente,
    cambiar,
    reagendando,
    setReagendando,
    paraReagendar,
    nuevas,
    refrescarAhora,
    connected,
    realtimeError,
  } = useAgendaAcciones({ doctorId, doctors });

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

  function accionar(appointmentId: string, action: string) {
    if (action === "reschedule") {
      const cita = visibles.find((c) => c.id === appointmentId);
      if (cita) setReagendando(cita);
      return;
    }
    cambiar(appointmentId, action);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="space-y-3"
    >
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
          onClick={refrescarAhora}
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
            día siguiente, se indica sólo en qué días hay algo.
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
            <AgendaTable
              citas={visibles}
              pendiente={pendiente}
              onAccion={accionar}
              orgName={orgName}
            />
          </div>

          <AgendaCards
            citas={visibles}
            pendiente={pendiente}
            onCambiar={cambiar}
            onReagendar={setReagendando}
            orgName={orgName}
          />
        </>
      )}

      <p className="sr-only" aria-live="polite">
        {pendiente ? "Actualizando cita" : ""}
      </p>

      <AnimatePresence>
        {reagendando ? (
          <StaffRescheduleModal
            appointment={paraReagendar(reagendando)}
            doctors={doctors}
            defaultDate={dayKey}
            onClose={() => setReagendando(null)}
            onDone={() => setReagendando(null)}
          />
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

function normalizar(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}