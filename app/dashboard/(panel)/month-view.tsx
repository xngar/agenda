"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppointmentStatus, DoctorAppointment } from "@/lib/types";
import { APPOINTMENT_STATUSES, STATUS_LABEL } from "@/lib/types";
import {
  addDaysToKey,
  addMonthsToKey,
  dateKey,
  formatTime,
  monthLabel,
} from "@/lib/dates";
import { parseAppointmentRange } from "@/lib/range";
import { EmptyState, StatusBadge } from "@/components/ui";
import { useRealtimeNotifications } from "../use-realtime";

interface Props {
  initial: DoctorAppointment[];
  /** "yyyy-MM" del mes mostrado. */
  mesKey: string;
  /** Rango completo de la grilla (semanas lunes→domingo). */
  gridFrom: string;
  gridTo: string;
  /** Hoy según la zona de la clínica. */
  hoy: string;
  currentUserId: string;
  isAdmin: boolean;
  /** Profesional cuyas notificaciones se escuchan (el filtro o el dueño). */
  realtimeDoctorId: string;
  /** `?doctor=` actual, para que la navegación no lo pierda. */
  doctorFilter: string | null;
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
 * se muta en el cliente y los cambios de otros profesionales aparecen solos.
 */
export function MonthView({
  initial,
  mesKey,
  gridFrom,
  gridTo,
  hoy,
  currentUserId,
  isAdmin,
  realtimeDoctorId,
  doctorFilter,
}: Props) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ x: number; y: number; cita: DoctorAppointment } | null>(null);
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevas, setNuevas] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { connected, error: realtimeError } = useRealtimeNotifications(
    realtimeDoctorId,
    useCallback(() => {
      setNuevas((n) => n + 1);
    }, []),
  );

  /** Citas agrupadas por DÍA LOCAL de la clínica, no por día UTC. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, { cita: DoctorAppointment; start: string; end: string }[]>();
    for (const cita of initial) {
      const { start, end } = parseAppointmentRange(cita.during);
      if (!start) continue;
      const key = dateKey(start);
      const lista = mapa.get(key);
      const item = { cita, start, end };
      if (lista) lista.push(item);
      else mapa.set(key, [item]);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.start.localeCompare(b.start));
    }
    return mapa;
  }, [initial]);

  const dias = useMemo(() => {
    const lista: string[] = [];
    for (let key = gridFrom; key <= gridTo; key = addDaysToKey(key, 1)) lista.push(key);
    return lista;
  }, [gridFrom, gridTo]);

  /** El menú sólo aparece para el dueño de la cita o un admin. */
  function puedeActuar(cita: DoctorAppointment): boolean {
    return isAdmin || cita.doctor_id === currentUserId;
  }

  function accionesDe(cita: DoctorAppointment): Accion[] {
    if (cita.status === "cancelled") {
      return [{ etiqueta: "Reabrir", action: "reopen" }];
    }
    if (cita.status === "pending") {
      return [
        { etiqueta: "Confirmar", action: "confirmed", tono: "primario" },
        { etiqueta: "Rechazar", action: "cancelled", tono: "peligro" },
      ];
    }
    return [
      { etiqueta: "Completar", action: "completed" },
      { etiqueta: "No asistió", action: "no_show" },
      { etiqueta: "Cancelar", action: "cancelled", tono: "peligro" },
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
    setError(null);
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
      setMenu(null);
      setNuevas(0);
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
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
    <section aria-label="Calendario mensual" className="space-y-3">
      {/* Navegación del mes + estado en vivo */}
      <div className="flex flex-wrap items-center justify-between gap-2">
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
          className="w-full rounded-xl border border-brand-sky bg-brand-sky-50 px-4 py-2.5 text-sm font-medium text-brand-navy"
        >
          Hay cambios nuevos en la agenda · actualizar
        </button>
      ) : null}

      {/* Grilla */}
      <div key={mesKey} className="overflow-x-auto pb-1">
        <div className="grid min-w-[42rem] grid-cols-7 gap-1.5 sm:gap-2">
          {DIAS_SEMANA.map((label) => (
            <div key={label} className="pb-1 text-center text-xs font-semibold uppercase text-neutral-500">
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
                className={`anim-month-cell flex min-h-24 flex-col gap-1 rounded-2xl border p-1.5 transition-colors duration-150 sm:min-h-28 ${
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
                      className={`w-full truncate rounded-lg border border-neutral-200 border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight transition-all duration-150 hover:-translate-y-px hover:shadow-card ${CHIP_TONO[cita.status]}`}
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
            className="anim-menu fixed z-50 w-56 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-lift"
          >
            <p className="truncate px-2.5 py-2 text-xs font-semibold text-neutral-500">
              {formatTime(parseAppointmentRange(menu.cita.during).start)} ·{" "}
              {menu.cita.patient?.full_name ?? "Paciente"}
            </p>

            {accionesDe(menu.cita).map((accion) => {
              const ocupado = pendiente === menu.cita.id + accion.action;
              return (
                <button
                  key={accion.action}
                  type="button"
                  role="menuitem"
                  disabled={Boolean(pendiente)}
                  onClick={() => ejecutar(menu.cita.id, accion.action)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    accion.tono === "primario"
                      ? "bg-brand-navy text-white hover:bg-brand-navy-800"
                      : accion.tono === "peligro"
                        ? "text-red-700 hover:bg-red-50"
                        : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  {accion.etiqueta}
                  {ocupado ? <span className="text-xs opacity-80">…</span> : null}
                </button>
              );
            })}

            {error ? (
              <p role="alert" className="px-2.5 pb-1.5 pt-2 text-xs font-medium text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

type Accion = { etiqueta: string; action: string; tono?: "primario" | "peligro" };

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
  no_show: "border-l-red-400 bg-red-50 text-red-700",
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
