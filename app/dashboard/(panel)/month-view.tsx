"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AppointmentStatus, DoctorAppointment } from "@/lib/types";
import { APPOINTMENT_STATUSES, STATUS_LABEL } from "@/lib/types";
import {
  addDaysToKey,
  addMonthsToKey,
  formatTime,
  monthLabel,
} from "@/lib/dates";
import { parseAppointmentRange } from "@/lib/range";
import { whatsappPhone } from "@/lib/phone";
import { appointmentsByDay } from "@/lib/agenda";
import { EmptyState, StatusBadge } from "@/components/ui";
import { WhatsappIcon, WhatsappModal } from "@/components/dashboard/whatsapp-button";
import { useRealtimeNotifications } from "../use-realtime";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw } from "lucide-react";
import { DUR, EASE } from "@/lib/motion";

interface Props {
  initial: DoctorAppointment[];
  /** "yyyy-MM" del mes mostrado. */
  mesKey: string;
  /** Rango completo de la grilla (semanas lunes→domingo). */
  gridFrom: string;
  gridTo: string;
  /** Hoy según la zona de la clínica. */
  hoy: string;
  /** Zona de la organización: define a qué día local pertenece cada cita. */
  timezone?: string;
  currentUserId: string;
  /** Admin o recepción: pueden actuar sobre cualquier cita de la organización. */
  canManage: boolean;
  /** Profesional cuyas notificaciones se escuchan (el filtro o el dueño). */
  realtimeDoctorId: string;
  /** `?doctor=` actual, para que la navegación no lo pierda. */
  doctorFilter: string | null;
  /** Nombre de la clínica, para el mensaje de WhatsApp. */
  orgName: string;
}

/**
 * Calendario mensual de la agenda.
 *
 * Requisitos que dio el producto:
 *   1. visión global del mes, con nombre y horario de cada cita en su día;
 *   2. segundo botón (y click izquierdo, para táctil) sobre una cita abre
 *      un menú para confirmar o rechazar, con paridad de acciones con la
 *      vista día.
 *
 * La fuente de verdad sigue siendo el servidor: cada acción hace
 * `router.refresh()` (mismo patrón que `Agenda`), así que la grilla nunca
 * se muta en el cliente. Las notificaciones Realtime también refrescan
 * solas con debounce, así los cambios de otros profesionales o del
 * paciente aparecen sin clic manual (el aviso queda como respaldo).
 */
export function MonthView({
  initial,
  mesKey,
  gridFrom,
  gridTo,
  hoy,
  timezone,
  currentUserId,
  canManage,
  realtimeDoctorId,
  doctorFilter,
  orgName,
}: Props) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ x: number; y: number; cita: DoctorAppointment } | null>(null);
  const [contacto, setContacto] = useState<DoctorAppointment | null>(null);
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [nuevas, setNuevas] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  const { connected, error: realtimeError } = useRealtimeNotifications(
    realtimeDoctorId,
    useCallback(() => {
      setNuevas((n) => n + 1);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        router.refresh();
        setNuevas(0);
      }, 1500);
    }, [router]),
  );

  /** Citas agrupadas por DÍA LOCAL de la clínica, no por día UTC. */
  const porDia = useMemo(() => appointmentsByDay(initial, timezone), [initial, timezone]);

  const dias = useMemo(() => {
    const lista: string[] = [];
    for (let key = gridFrom; key <= gridTo; key = addDaysToKey(key, 1)) lista.push(key);
    return lista;
  }, [gridFrom, gridTo]);

  /** El menú aparece para el dueño de la cita, un admin o la recepción. */
  function puedeActuar(cita: DoctorAppointment): boolean {
    return canManage || cita.doctor_id === currentUserId;
  }

  function accionesDe(cita: DoctorAppointment): Accion[] {
    const whatsapp: Accion = {
      etiqueta: "Enviar mensaje",
      action: "whatsapp",
      tono: "whatsapp",
    };
    if (cita.status === "cancelled") {
      return [{ etiqueta: "Reabrir", action: "reopen" }, whatsapp];
    }
    if (cita.status === "pending") {
      return [
        { etiqueta: "Confirmar", action: "confirmed", tono: "primario" },
        { etiqueta: "Rechazar", action: "cancelled", tono: "peligro" },
        whatsapp,
      ];
    }
    return [
      { etiqueta: "Completar", action: "completed" },
      { etiqueta: "No asistió", action: "no_show" },
      { etiqueta: "Cancelar", action: "cancelled", tono: "peligro" },
      whatsapp,
    ];
  }

  function abrirMenu(e: React.MouseEvent, cita: DoctorAppointment) {
    if (!puedeActuar(cita)) return;
    e.preventDefault();
    e.stopPropagation();

    // Clamp al viewport: en pantallas chicas el menú nunca sale cortado.
    const ancho = 232;
    const alto = 56 + accionesDe(cita).length * 40;
    const x = Math.max(8, Math.min(e.clientX, window.innerWidth - ancho - 8));
    const y = Math.max(8, Math.min(e.clientY, window.innerHeight - alto - 8));
    setMenu({ x, y, cita });
  }

  // Cerrar con Escape, con scroll o con resize (el menú es de posición fija).
  useEffect(() => {
    if (!menu) return;
    const cerrar = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [menu]);

  // Al abrir, el foco va al primer acción del menú (accesibilidad).
  // `preventScroll` evita que el navegador dispare un scroll al enfocar y
  // cierre el menú de inmediato (hay un listener de scroll que lo cierra).
  useEffect(() => {
    if (menu) menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }, [menu]);

  async function ejecutar(appointmentId: string, action: string) {
    if (action === "whatsapp") {
      const cita = initial.find((c) => c.id === appointmentId);
      if (cita) setContacto(cita);
      setMenu(null);
      return;
    }
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
      setMenu(null);
      setNuevas(0);
      toast.success("Cita actualizada");
      router.refresh();
    } catch {
      toast.error("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setPendiente(null);
    }
  }

  function irA(params: Record<string, string>) {
    const search = new URLSearchParams(params);
    if (doctorFilter) search.set("doctor", doctorFilter);
    router.push(`/dashboard?${search.toString()}`);
  }

  function irAlDia(dia: string) {
    irA({ date: dia });
  }

  function irAMes(mes: string) {
    irA({ view: "mes", month: mes });
  }

  const total = initial.length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.element, ease: EASE.out }}
      aria-label="Calendario mensual"
      className="space-y-3"
    >
      {/* Navegación del mes + estado en vivo */}
      <div className="flex flex-wrap items-center gap-2 rounded-card border border-neutral-200 bg-white p-2 shadow-card">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => irAMes(addMonthsToKey(mesKey, -1))}
            aria-label="Mes anterior"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-brand-navy-300 hover:text-brand-navy"
          >
            <ChevronLeft />
          </button>
          <h2
            key={mesKey}
            className="anim-label min-w-40 px-2 text-center text-lg font-semibold text-brand-navy"
          >
            {monthLabel(mesKey)}
          </h2>
          <button
            type="button"
            onClick={() => irAMes(addMonthsToKey(mesKey, 1))}
            aria-label="Mes siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-brand-navy-300 hover:text-brand-navy"
          >
            <ChevronRight />
          </button>
          <button
            type="button"
            onClick={() => irAMes(hoy.slice(0, 7))}
            disabled={mesKey === hoy.slice(0, 7)}
            className="ml-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-brand-navy-300 hover:text-brand-navy disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hoy
          </button>
        </div>

        <p className="ml-auto flex items-center gap-2 px-1 text-xs text-neutral-500">
          <span
            aria-hidden
            className={`inline-block size-2 rounded-full ${
              connected ? "bg-success-600" : realtimeError ? "bg-danger-600" : "bg-neutral-300"
            }`}
          />
          {connected ? "En vivo" : realtimeError ? "Sin conexión en vivo" : "Conectando…"}
        </p>
      </div>

      {/* Leyenda de estados: la misma que las insignias de la vista día */}
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Estados de las citas">
        {APPOINTMENT_STATUSES.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>

      {nuevas > 0 ? (
        <button
          type="button"
          onClick={() => {
            setNuevas(0);
            router.refresh();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-sky-400/60 bg-brand-sky-50 px-4 py-2.5 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-sky-100"
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
          Hay cambios nuevos en la agenda · actualizar
        </button>
      ) : null}

      {/* Grilla */}
      <div key={mesKey} className="overflow-x-auto pb-1">
        <div className="grid min-w-[24rem] grid-cols-7 gap-1 sm:min-w-[42rem] sm:gap-2">
          {DIAS_SEMANA.map((label) => (
            <div key={label} className="pb-1 text-center text-[10px] font-semibold uppercase text-neutral-500 sm:text-xs">
              {label}
            </div>
          ))}

          {dias.map((dia, i) => {
            const citas = porDia.get(dia) ?? [];
            const enMes = dia.slice(0, 7) === mesKey;
            const esHoy = dia === hoy;
            const visibles = citas.slice(0, MAX_POR_DIA);
            const resto = citas.length - visibles.length;

            return (
              <div
                key={dia}
                style={{ animationDelay: `${Math.min(i, 21) * 16}ms` }}
                className={`anim-month-cell flex min-h-20 flex-col gap-1 rounded-card border p-1 transition-colors duration-150 sm:min-h-28 sm:p-1.5 ${
                  esHoy
                    ? "border-brand-sky bg-brand-sky-50"
                    : enMes
                      ? "border-neutral-200 bg-white hover:border-brand-navy-300"
                      : "border-neutral-200/70 bg-neutral-50/70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => irAlDia(dia)}
                    aria-label={`Ver la agenda del ${diaLabel(dia)}`}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors ${
                      esHoy
                        ? "bg-brand-navy text-white hover:bg-brand-navy-800"
                        : enMes
                          ? "text-neutral-600 hover:bg-brand-navy-100"
                          : "text-neutral-400 hover:bg-neutral-200"
                    }`}
                  >
                    {Number(dia.slice(8))}
                  </button>

                  {citas.length > 0 ? (
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                        esHoy ? "bg-white/70 text-brand-navy" : "text-neutral-400"
                      }`}
                      aria-hidden
                    >
                      {citas.length}
                    </span>
                  ) : null}
                </div>

                {visibles.map(({ cita, start, end }) => {
                  const nombre = cita.patient?.full_name ?? "Paciente";
                  const canAct = puedeActuar(cita);

                  return (
                    <button
                      key={cita.id}
                      data-cita
                      type="button"
                      title={`${formatTime(start)} – ${formatTime(end)} · ${nombre} · ${
                        cita.service?.name ? `${cita.service.name} · ` : ""
                      }${STATUS_LABEL[cita.status]}`}
                      aria-label={`${formatTime(start)} ${nombre}, ${STATUS_LABEL[cita.status]}. ${
                        canAct ? "Ver acciones de la cita" : "Ver día"
                      }`}
                      aria-haspopup={canAct ? "menu" : undefined}
                      onClick={(e) => {
                        if (canAct) abrirMenu(e, cita);
                        else irAlDia(dia);
                      }}
                      onContextMenu={(e) => {
                        if (canAct) abrirMenu(e, cita);
                      }}
                      className={`w-full truncate rounded-lg border border-neutral-200 border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight transition-[color,background-color,border-color,box-shadow,transform] duration-micro ease-out-soft hover:-translate-y-0.5 hover:shadow-card active:scale-[0.98] cursor-pointer ${CHIP_TONO[cita.status]}`}
                    >
                      <span className="font-semibold tabular-nums">{formatTime(start)}</span>{" "}
                      <span className="font-medium">{nombre}</span>
                    </button>
                  );
                })}

                {resto > 0 ? (
                  <button
                    type="button"
                    onClick={() => irAlDia(dia)}
                    className="w-full rounded-lg px-1.5 py-0.5 text-left text-[11px] font-semibold text-brand-navy transition-colors hover:bg-brand-navy-50"
                  >
                    +{resto} más
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          title="Sin citas este mes"
          description="No hay horas reservadas en este mes. Usa las flechas para recorrer otros meses."
        />
      ) : null}

      <p className="sr-only" aria-live="polite">
        {pendiente ? "Actualizando cita" : ""}
      </p>

      {/* Menú contextual de la cita */}
      {menu ? (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setMenu(null)} />
          <div
            ref={menuRef}
            role="menu"
            aria-label="Acciones de la cita"
            style={{ left: menu.x, top: menu.y }}
            className="anim-menu fixed z-50 w-56 rounded-card border border-neutral-200 bg-white p-1.5 shadow-lift"
          >
            <p className="truncate px-2.5 py-2 text-xs font-semibold text-neutral-500">
              {formatTime(parseAppointmentRange(menu.cita.during).start)} ·{" "}
              {menu.cita.patient?.full_name ?? "Paciente"}
              {menu.cita.patient?.rut ? ` · ${menu.cita.patient.rut}` : ""}
            </p>

            {accionesDe(menu.cita).map((accion) => {
              const ocupado = pendiente === menu.cita.id + accion.action;
              const sinCelular =
                accion.action === "whatsapp" &&
                !whatsappPhone(menu.cita.patient?.phone ?? null);
              return (
                <button
                  key={accion.action}
                  type="button"
                  role="menuitem"
                  disabled={Boolean(pendiente) || sinCelular}
                  title={sinCelular ? "Sin celular registrado" : undefined}
                  onClick={() => ejecutar(menu.cita.id, accion.action)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    accion.tono === "primario"
                      ? "bg-brand-navy text-white hover:bg-brand-navy-800"
                      : accion.tono === "peligro"
                        ? "text-danger-700 hover:bg-danger-50"
                        : accion.tono === "whatsapp"
                          ? "text-success-700 hover:bg-success-50"
                          : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {accion.tono === "whatsapp" ? (
                      <WhatsappIcon className="h-4 w-4" />
                    ) : null}
                    {accion.etiqueta}
                  </span>
                  {ocupado ? <span className="text-xs opacity-80">…</span> : null}
                </button>
              );
            })}

          </div>
        </>
      ) : null}

      <AnimatePresence>
        {contacto ? (
          <WhatsappModal
            key={contacto.id}
            patientId={contacto.patient_id}
            fullName={contacto.patient?.full_name ?? "Paciente"}
            phone={contacto.patient?.phone ?? null}
            orgName={orgName}
            onClose={() => setContacto(null)}
          />
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

type Accion = { etiqueta: string; action: string; tono?: "primario" | "peligro" | "whatsapp" };

/** Celdas visibles antes del "+N más": el mes no se convierte en un scroll infinito. */
const MAX_POR_DIA = 4;

const DIAS_SEMANA = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

/**
 * Chip por estado. Misma historia de color que `StatusBadge`
 * (components/ui.tsx): navy = confirmada, celeste = por confirmar,
 * gris atenuada = cancelada.
 */
const CHIP_TONO: Record<AppointmentStatus, string> = {
  confirmed: "border-l-brand-navy bg-brand-navy-50 text-brand-navy-900",
  pending: "border-l-brand-sky-400 bg-brand-sky-50 text-brand-navy",
  cancelled:
    "border-l-neutral-300 bg-neutral-100 text-neutral-500 line-through decoration-neutral-400",
  completed: "border-l-brand-navy-300 bg-neutral-100 text-neutral-700",
  no_show: "border-l-danger-600 bg-danger-50 text-danger-700",
};

/** "lunes 5 de octubre", en la zona UTC de las claves de día. */
function diaLabel(dia: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${dia}T12:00:00Z`));
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
