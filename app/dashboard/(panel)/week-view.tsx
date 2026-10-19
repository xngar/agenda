"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DoctorAppointment, AppointmentStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { appointmentsByDay, repartirEnCarriles, type BloqueHorario } from "@/lib/agenda";
import {
  addDaysToKey,
  dateKey,
  durationMinutes,
  formatTime,
  minutesSinceMidnight,
} from "@/lib/dates";
import { parseAppointmentRange } from "@/lib/range";
import { whatsappPhone } from "@/lib/phone";
import { useAgendaAcciones } from "./agenda-actions";
import { StaffRescheduleModal } from "./staff-reschedule-modal";
import { WhatsappIcon, WhatsappModal } from "@/components/dashboard/whatsapp-button";
import type { StaffDoctor } from "./staff-booking-button";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw } from "lucide-react";
import { DUR, EASE } from "@/lib/motion";

/* ------------------------------------------------------------------ */
/* Constantes de layout                                                 */
/* ------------------------------------------------------------------ */

/** Altura en píxeles de una hora en la grilla. */
const PX_POR_HORA = 64;
/** Minuto a partir del que empieza la grilla visible (08:00). */
const HORA_INICIO = 8 * 60;
/** Minuto en que termina la grilla visible (21:00). */
const HORA_FIN = 21 * 60;
/** Total de minutos visibles. */
const MINUTOS_VISIBLES = HORA_FIN - HORA_INICIO;
/** Total de píxeles de la cuadrícula vertical. */
const ALTO_GRILLA = (MINUTOS_VISIBLES / 60) * PX_POR_HORA;
/** Ancho mínimo de cada columna de día en píxeles. */
const ANCHO_DIA = 120;

/** Colores por estado: fondo, borde izquierdo y texto. */
const CHIP: Record<AppointmentStatus, { bg: string; border: string; text: string; badge: string }> = {
  confirmed: {
    bg: "bg-brand-navy-50",
    border: "border-l-brand-navy",
    text: "text-brand-navy-900",
    badge: "bg-brand-navy text-white",
  },
  pending: {
    bg: "bg-brand-sky-50",
    border: "border-l-brand-sky-400",
    text: "text-brand-navy",
    badge: "bg-brand-sky-400 text-white",
  },
  cancelled: {
    bg: "bg-neutral-100",
    border: "border-l-neutral-300",
    text: "text-neutral-400",
    badge: "bg-neutral-300 text-neutral-700",
  },
  completed: {
    bg: "bg-neutral-50",
    border: "border-l-brand-navy-300",
    text: "text-neutral-600",
    badge: "bg-brand-navy-300 text-white",
  },
  no_show: {
    bg: "bg-danger-50",
    border: "border-l-danger-600",
    text: "text-danger-700",
    badge: "bg-danger-600 text-white",
  },
};

/* ------------------------------------------------------------------ */
/* Componente principal                                                 */
/* ------------------------------------------------------------------ */

/**
 * Grilla semanal estilo Google Calendar.
 *
 * Eje Y: horas del día (08:00 – 21:00). Cada minuto = 1 px × (PX_POR_HORA/60).
 * Eje X: 7 columnas, una por día (Lun→Dom).
 *
 * Las citas se posicionan absolutamente dentro de su columna con `top` y
 * `height` proporcionales a la hora local de la clínica (no UTC ni la
 * del navegador). Si dos citas se solapan, `repartirEnCarriles` las
 * distribuye en sub-columnas para que nunca se tapen.
 */
export function WeekView({
  initial,
  weekFrom,
  weekTo,
  hoy,
  timezone,
  doctorId,
  doctors,
  orgName,
}: {
  initial: DoctorAppointment[];
  weekFrom: string;
  weekTo: string;
  hoy: string;
  timezone?: string;
  doctorId: string;
  doctors: StaffDoctor[];
  /** Nombre de la clínica, para el mensaje de WhatsApp. */
  orgName: string;
}) {
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

  const porDia = useMemo(() => appointmentsByDay(initial, timezone), [initial, timezone]);

  const dias = useMemo(() => {
    const lista: string[] = [];
    for (let key = weekFrom; key <= weekTo; key = addDaysToKey(key, 1)) lista.push(key);
    return lista;
  }, [weekFrom, weekTo]);

  const conCitas = dias.filter((dia) => (porDia.get(dia)?.length ?? 0) > 0);

  /** Menú contextual de la cita */
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    cita: DoctorAppointment;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  /** Cita cuyo WhatsApp se está redactando. */
  const [contacto, setContacto] = useState<DoctorAppointment | null>(null);

  useEffect(() => {
    if (!menu) return;
    const cerrar = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [menu]);

  useEffect(() => {
    if (menu) menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }, [menu]);

  function abrirMenu(e: React.MouseEvent, cita: DoctorAppointment) {
    e.preventDefault();
    e.stopPropagation();
    const ancho = 224;
    const alto = 56 + accionesDe(cita).length * 40;
    const x = Math.max(8, Math.min(e.clientX, window.innerWidth - ancho - 8));
    const y = Math.max(8, Math.min(e.clientY, window.innerHeight - alto - 8));
    setMenu({ x, y, cita });
  }

  const router = useRouter();

  async function ejecutar(appointmentId: string, action: string) {
    if (action === "whatsapp") {
      const cita = initial.find((c) => c.id === appointmentId);
      if (cita) setContacto(cita);
      setMenu(null);
      return;
    }
    if (action === "reschedule") {
      const cita = initial.find((c) => c.id === appointmentId);
      if (cita) setReagendando(cita);
      setMenu(null);
      return;
    }
    setMenu(null);
    await cambiar(appointmentId, action);
  }

  function irAlDia(dia: string) {
    router.push(`/dashboard?date=${dia}`);
  }

  /** Posición y alto en píxeles para una cita dada sus ISO de inicio y fin. */
  function geometria(start: string, end: string): { top: number; height: number; fuera: boolean } {
    const startMin = minutesSinceMidnight(start, timezone);
    const endMin = startMin + Math.max(durationMinutes(start, end), 15); // mínimo 15 min visible
    const top = ((Math.max(startMin, HORA_INICIO) - HORA_INICIO) / 60) * PX_POR_HORA;
    const height = ((Math.min(endMin, HORA_FIN) - Math.max(startMin, HORA_INICIO)) / 60) * PX_POR_HORA;
    const fuera = startMin < HORA_INICIO || startMin >= HORA_FIN;
    return { top, height: Math.max(height, 16), fuera };
  }

  /** Marcas horarias del eje Y: cada hora desde HORA_INICIO hasta HORA_FIN. */
  const marcas = useMemo(() => {
    const lista: { label: string; top: number }[] = [];
    for (let m = HORA_INICIO; m < HORA_FIN; m += 60) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      lista.push({ label: `${hh}:00`, top: ((m - HORA_INICIO) / 60) * PX_POR_HORA });
    }
    return lista;
  }, []);

  /** Línea de "ahora": posición vertical dentro de la grilla del día actual. */
  const ahoraMin = useMemo(() => {
    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    return min >= HORA_INICIO && min < HORA_FIN ? min : null;
  }, []);
  const ahoraTop = ahoraMin !== null
    ? ((ahoraMin - HORA_INICIO) / 60) * PX_POR_HORA
    : null;

  const estaSemanaTieneHoy = dias.includes(hoy);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.element, ease: EASE.out }}
      className="space-y-3"
      aria-label="Agenda de la semana"
    >
      {/* Cabecera de estado */}
      <div className="flex flex-wrap items-center gap-2 rounded-card border border-neutral-200 bg-white p-2 shadow-card">
        <p className="px-1 text-sm text-neutral-600">
          {initial.length} cita{initial.length === 1 ? "" : "s"} esta semana en{" "}
          {conCitas.length} día{conCitas.length === 1 ? "" : "s"}.
        </p>
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

      {nuevas > 0 ? (
        <button
          type="button"
          onClick={refrescarAhora}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-sky-400/60 bg-brand-sky-50 px-4 py-2.5 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-sky-100"
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
          Hay cambios nuevos en la agenda · actualizar
        </button>
      ) : null}

      {/* ---- Grilla horaria: siempre visible, con o sin citas ---- */}
      <div className="overflow-x-auto rounded-card border border-neutral-200 bg-white shadow-card">
        <div
          style={{ minWidth: `${52 + dias.length * ANCHO_DIA}px` }}
          className="flex"
        >
          {/* Eje Y: etiquetas de hora */}
          <div className="relative shrink-0 select-none border-r border-neutral-100" style={{ width: 52 }}>
            {/* Espacio para las cabeceras de día */}
            <div style={{ height: 56 }} className="border-b border-neutral-200" />
            {/* Etiquetas de hora */}
            <div className="relative" style={{ height: ALTO_GRILLA }}>
              {marcas.map(({ label, top }) => (
                <div
                  key={label}
                  style={{ top }}
                  className="absolute right-2 -translate-y-2.5 text-[10px] tabular-nums text-neutral-400"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Columnas de días */}
          {dias.map((dia) => {
            const citasDia = porDia.get(dia) ?? [];
            const esHoy = dia === hoy;

            const bloques: BloqueHorario[] = citasDia.map(({ cita, start, end }) => ({
              id: cita.id,
              startMin: minutesSinceMidnight(start, timezone),
              endMin:
                minutesSinceMidnight(start, timezone) +
                Math.max(durationMinutes(start, end), 15),
            }));
            const carriles = repartirEnCarriles(bloques);

            return (
              <div
                key={dia}
                className="flex min-w-0 flex-1 flex-col border-l border-neutral-200"
                style={{ minWidth: ANCHO_DIA }}
              >
                {/* Cabecera del día — clic navega a vista día */}
                <button
                  type="button"
                  onClick={() => irAlDia(dia)}
                  title={`Ver agenda de ${cabeceraDia(dia)}`}
                  className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 border-b border-neutral-200 transition-colors hover:bg-brand-sky-50 ${
                    esHoy ? "bg-brand-sky-50" : "bg-neutral-50"
                  }`}
                >
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wide ${
                      esHoy ? "text-brand-navy" : "text-neutral-500"
                    }`}
                  >
                    {diaNombreCorto(dia)}
                  </span>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                      esHoy ? "bg-brand-navy text-white" : "text-neutral-700"
                    }`}
                  >
                    {Number(dia.slice(8))}
                  </span>
                </button>

                {/* Cuadrícula vertical: ALTO_GRILLA px con position:relative */}
                <div className="relative" style={{ height: ALTO_GRILLA }}>
                  {/* Líneas de hora (sólidas) */}
                  {marcas.map(({ top }, i) => (
                    <div
                      key={i}
                      style={{ top }}
                      className="absolute inset-x-0 border-t border-neutral-100"
                    />
                  ))}
                  {/* Líneas de media hora (punteadas) */}
                  {marcas.map(({ top }, i) => (
                    <div
                      key={`h-${i}`}
                      style={{ top: top + PX_POR_HORA / 2 }}
                      className="absolute inset-x-0 border-t border-dashed border-neutral-100"
                    />
                  ))}

                  {/* Línea de "ahora" */}
                  {esHoy && estaSemanaTieneHoy && ahoraTop !== null ? (
                    <div
                      style={{ top: ahoraTop }}
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                    >
                      <span className="ml-1 size-2 shrink-0 rounded-full bg-danger-600" />
                      <span className="h-px flex-1 bg-danger-600" />
                    </div>
                  ) : null}

                  {/* Citas posicionadas absolutamente dentro de la columna */}
                  {citasDia.map(({ cita, start, end }) => {
                    const { top, height, fuera } = geometria(start, end);
                    if (fuera) return null;

                    const reparto = carriles.get(cita.id);
                    const carril = reparto?.carril ?? 0;
                    const totalCarriles = reparto?.carriles ?? 1;
                    const leftPct = (carril / totalCarriles) * 100;
                    const widthPct = (1 / totalCarriles) * 100;

                    const chip = CHIP[cita.status] ?? CHIP.confirmed;
                    const nombre = cita.patient?.full_name ?? "Paciente";
                    const cancelada = cita.status === "cancelled";

                    return (
                      <button
                        key={cita.id}
                        type="button"
                        style={{
                          position: "absolute",
                          top,
                          height,
                          left: `${leftPct}%`,
                          width: `calc(${widthPct}% - 2px)`,
                          marginLeft: 1,
                          marginRight: 1,
                        }}
                        className={`overflow-hidden rounded-lg border border-transparent border-l-[3px] px-1.5 py-0.5 text-left transition-[color,background-color,border-color,box-shadow,transform] duration-micro ease-out-soft hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-sky ${
                          chip.bg
                        } ${chip.border} ${chip.text} ${
                          cancelada ? "opacity-60 line-through decoration-neutral-400" : ""
                        } ${pendiente?.startsWith(cita.id) ? "opacity-50" : ""}`}
                        title={`${formatTime(start)} – ${formatTime(end)} · ${nombre}${
                          cita.service ? ` · ${cita.service.name}` : ""
                        } · ${STATUS_LABEL[cita.status]}`}
                        aria-label={`${formatTime(start)} ${nombre}, ${STATUS_LABEL[cita.status]}. Ver acciones`}
                        aria-haspopup="menu"
                        onClick={(e) => abrirMenu(e, cita)}
                        onContextMenu={(e) => abrirMenu(e, cita)}
                      >
                        <span className="block truncate text-[11px] font-bold tabular-nums leading-tight">
                          {formatTime(start)}
                        </span>
                        {height >= 30 ? (
                          <span className="block truncate text-[11px] font-medium leading-tight">
                            {nombre}
                          </span>
                        ) : null}
                        {height >= 48 && cita.service ? (
                          <span className="block truncate text-[10px] leading-tight opacity-80">
                            {cita.service.name}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {conCitas.length === 0 ? (
        <p className="text-center text-sm text-neutral-500">
          Sin citas reservadas esta semana.
        </p>
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
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-micro ease-out-soft active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
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
        {reagendando ? (
          <StaffRescheduleModal
            appointment={paraReagendar(reagendando)}
            doctors={doctors}
            defaultDate={dayOf(reagendando, timezone) ?? weekFrom}
            onClose={() => setReagendando(null)}
            onDone={() => setReagendando(null)}
          />
        ) : null}
      </AnimatePresence>

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

/* ------------------------------------------------------------------ */
/* Helpers de UI                                                        */
/* ------------------------------------------------------------------ */

type Accion = { etiqueta: string; action: string; tono?: "primario" | "peligro" | "whatsapp" };

function accionesDe(cita: DoctorAppointment): Accion[] {
  const whatsapp: Accion = {
    etiqueta: "Enviar mensaje",
    action: "whatsapp",
    tono: "whatsapp",
  };
  if (cita.status === "cancelled") {
    return [{ etiqueta: "Reabrir", action: "reopen" }, whatsapp];
  }
  const lista: Accion[] = [];
  if (cita.status === "pending") {
    lista.push({ etiqueta: "Confirmar", action: "confirmed", tono: "primario" });
  }
  lista.push({ etiqueta: "Completar", action: "completed" });
  lista.push({ etiqueta: "No asistió", action: "no_show" });
  if (cita.status === "pending" || cita.status === "confirmed") {
    lista.push({ etiqueta: "Reagendar", action: "reschedule" });
  }
  lista.push({ etiqueta: "Cancelar", action: "cancelled", tono: "peligro" });
  lista.push(whatsapp);
  return lista;
}

/** "Lun", "Mar", etc. a partir de una clave de día, en zona UTC para evitar desfases. */
function diaNombreCorto(dayKey: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${dayKey}T12:00:00Z`));
}

/** "lunes 12 de octubre" para los tooltips y atributos aria. */
function cabeceraDia(dayKey: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${dayKey}T12:00:00Z`));
}

/** Día local de la clínica al que pertenece el inicio de la cita. */
function dayOf(cita: DoctorAppointment, timezone?: string): string | null {
  const { start } = parseAppointmentRange(cita.during);
  return start ? dateKey(start, timezone) : null;
}