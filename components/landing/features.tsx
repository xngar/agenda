"use client";

import {
  Calendar,
  FileText,
  Bell,
  Sparkles,
  Stethoscope,
  Brain,
  ShieldCheck,
  Clock,
  HeartPulse,
  UserCheck,
  CalendarCheck,
  Smartphone,
  Lock,
  Activity,
  Smile,
  Pencil,
  Check,
} from "lucide-react";
import { useState } from "react";
import { siteConfig } from "@/lib/site-config";
import { motion, AnimatePresence } from "motion/react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { useMotionPrefs } from "@/components/motion/use-motion-prefs";
import { MarqueeFade } from "@/components/landing/marquee-fade";
import { AnimatedNumber } from "@/components/motion/animated-number";

const marqueeItems = [
  { text: "Reservas online 24/7", Icon: Clock },
  { text: "Ficha clínica electrónica", Icon: FileText },
  { text: "Recordatorios automáticos", Icon: Bell },
  { text: "Odontograma interactivo", Icon: Sparkles },
  { text: "Seguridad y privacidad Ley 20.584", Icon: ShieldCheck },
  { text: "Atención multidisciplinaria", Icon: HeartPulse },
  { text: "Confirmación por WhatsApp", Icon: Smartphone },
  { text: "Control de ausencias", Icon: CalendarCheck },
  { text: "Gestión ágil de pacientes", Icon: UserCheck },
];

export default function Features() {
  const [tab, setTab] = useState<"odontologia" | "medicina" | "psicologia">("odontologia");
  const [selectedTooth, setSelectedTooth] = useState<number>(18);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("11:30");
  const { reduce } = useMotionPrefs();

  const teethData: Record<number, { name: string; treatment: string; status: string; color: string }> = {
    18: { name: "Pieza 1.8 (Tercer Molar)", treatment: "Obturación resina compuesta", status: "Tratada", color: "bg-emerald-500" },
    17: { name: "Pieza 1.7 (Segundo Molar)", treatment: "Sana - Sin hallazgos", status: "Sana", color: "bg-sky-400" },
    16: { name: "Pieza 1.6 (Primer Molar)", treatment: "Corona estética cerámica", status: "Finalizado", color: "bg-blue-600" },
    11: { name: "Pieza 1.1 (Incisivo Central)", treatment: "Control de blanqueamiento", status: "En seguimiento", color: "bg-emerald-500" },
    21: { name: "Pieza 2.1 (Incisivo Central)", treatment: "Sana", status: "Sana", color: "bg-sky-400" },
    26: { name: "Pieza 2.6 (Primer Molar)", treatment: "Sellante preventivo", status: "Preventivo", color: "bg-indigo-500" },
  };

  return (
    <section id="funciones" className="relative bg-white py-16 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Encabezado Principal */}
        <ScrollReveal yOffset={16} className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--lp-sky-200)] bg-[var(--lp-sky-100)]/60 px-3.5 py-1 text-xs font-semibold text-[var(--lp-navy)]">
            <Sparkles className="h-3.5 w-3.5 text-action-primary" />
            <span>Capacidades de la plataforma</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl [text-wrap:balance]">
            Diseñada para el flujo real de tu consulta médica o dental
          </h2>

          <p className="mt-4 text-base sm:text-lg text-neutral-600 [text-wrap:balance]">
            Cada especialidad tiene necesidades distintas. Por eso {siteConfig.name} unifica agenda pública, ficha clínica especializada y recordatorios inteligentes sin saturar a tu equipo.
          </p>
        </ScrollReveal>

        {/* Bento Grid Principal */}
        <div className="mt-14 grid gap-6 lg:grid-cols-12">
          {/* Tarjeta 1 (Bento Principal - 7 columnas): Explorador de Ficha Clínica por Especialidad */}
          <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 p-6 shadow-sm ring-1 ring-slate-100 transition-all duration-element hover:shadow-md lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--lp-sky-100)] text-[var(--lp-navy)]">
                    <FileText className="h-5 w-5 text-action-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">Ficha clínica especializada</h3>
                    <p className="text-xs text-neutral-500">Se adapta a la consulta de cada profesional</p>
                  </div>
                </div>

                {/* Selector de Especialidades en Pastilla */}
                <div className="flex items-center rounded-full bg-slate-100 p-1 text-xs font-medium">
                  {(
                    [
                      { id: "odontologia", label: "Odontología", icon: Smile },
                      { id: "medicina", label: "Medicina", icon: Stethoscope },
                      { id: "psicologia", label: "Salud Mental", icon: Brain },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => {
                    const isActive = tab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-micro ${
                          isActive
                            ? "bg-white font-semibold text-neutral-900 shadow-xs"
                            : "text-neutral-600 hover:text-neutral-900"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vista Interactiva según Especialidad */}
              <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs">
                <AnimatePresence mode="wait">
                  {tab === "odontologia" && (
                    <motion.div
                      key="odontologia"
                      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-800">Odontograma interactivo · Arcada superior</span>
                        <span className="text-[11px] text-neutral-500">Haz clic en una pieza</span>
                      </div>

                      {/* Simulador de Piezas Dentales */}
                      <div className="grid grid-cols-6 gap-2 sm:gap-3">
                        {[18, 17, 16, 11, 21, 26].map((tooth) => {
                          const isSel = selectedTooth === tooth;
                          const data = teethData[tooth];
                          return (
                            <button
                              key={tooth}
                              type="button"
                              onClick={() => setSelectedTooth(tooth)}
                              className={`group relative flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all duration-micro ${
                                isSel
                                  ? "border-[var(--lp-blue)] bg-sky-50/70 shadow-xs ring-2 ring-[var(--lp-blue)]/20"
                                  : "border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300"
                              }`}
                            >
                              <span className="text-[10px] font-bold text-neutral-500 group-hover:text-neutral-800">
                                #{tooth}
                              </span>
                              <div className="my-1.5 h-6 w-5 rounded-sm border border-neutral-300 bg-white shadow-3xs flex items-center justify-center">
                                <span className={`h-2.5 w-2.5 rounded-full ${data.color}`} />
                              </div>
                              <span className="text-[9px] font-medium text-neutral-600 truncate max-w-full">
                                {data.status}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Detalle de la Pieza Seleccionada */}
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                        <div>
                          <div className="font-bold text-neutral-900">{teethData[selectedTooth].name}</div>
                          <div className="text-neutral-600">{teethData[selectedTooth].treatment}</div>
                        </div>
                        <span className="rounded-md bg-white px-2 py-1 font-semibold text-emerald-700 shadow-3xs border border-emerald-200">
                          {teethData[selectedTooth].status}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {tab === "medicina" && (
                    <motion.div
                      key="medicina"
                      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-800">Signos vitales y examen físico</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                          <Activity className="h-3.5 w-3.5" />
                          Rangos normales
                        </span>
                      </div>

                      {/* Grid de Signos Vitales */}
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {[
                          { label: "Presión Arterial", value: "120/80", unit: "mmHg", status: "Óptima" },
                          { label: "Frecuencia Card.", value: "72", unit: "lpm", status: "Normal" },
                          { label: "Saturación O2", value: "98%", unit: "SpO2", status: "Normal" },
                          { label: "Temperatura", value: "36.6", unit: "°C", status: "Afebril" },
                        ].map((vital) => (
                          <div key={vital.label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                            <div className="text-[10px] font-medium text-neutral-500">{vital.label}</div>
                            <div className="mt-1 font-mono text-base font-bold text-neutral-900">
                              {vital.value} <span className="text-[10px] font-normal text-neutral-500">{vital.unit}</span>
                            </div>
                            <span className="mt-1 inline-block text-[10px] font-semibold text-emerald-600">
                              ✓ {vital.status}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                        <div className="flex items-center gap-2">
                          <Pencil className="h-4 w-4 text-[var(--lp-blue)]" />
                          <span className="font-medium text-neutral-700">Receta y órdenes de examen en 1 clic</span>
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-neutral-500">PDF con firma</span>
                      </div>
                    </motion.div>
                  )}

                  {tab === "psicologia" && (
                    <motion.div
                      key="psicologia"
                      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-neutral-800">
                          <Lock className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Notas confidenciales y evolución de paciente</span>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          Solo profesional
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs text-neutral-700 leading-relaxed">
                        <div className="flex items-center justify-between font-medium text-neutral-900 mb-1.5">
                          <span>Sesión #4 · Análisis de avance y metas</span>
                          <span className="text-neutral-500 font-mono text-[11px]">10 Nov 2026</span>
                        </div>
                        Paciente muestra adherencia positiva a las técnicas de respiración. Se acuerda registro de episodios ansiosos durante la jornada laboral previa a la próxima sesión.
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs border border-slate-100">
                        <span className="text-neutral-600">Consentimiento informado digital firmado</span>
                        <span className="font-semibold text-emerald-700">✓ Resguardado</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-neutral-500">
              <span>Cumple con el estándar MINSAL de Ficha Médica</span>
              <span className="font-semibold text-neutral-700">Exportable en PDF y CSV</span>
            </div>
          </div>

          {/* Tarjeta 2 (Bento 5 columnas): Notificación Inteligente por WhatsApp */}
          <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 p-6 shadow-sm ring-1 ring-slate-100 transition-all duration-element hover:shadow-md lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Recordatorios WhatsApp</h3>
                  <p className="text-xs text-neutral-500">Confirmación directa sin costo de llamadas</p>
                </div>
              </div>

              {/* Simulación del Chat de WhatsApp Interactivo */}
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-[#EFEAE2] p-4 shadow-inner">
                <div className="flex items-center gap-2 border-b border-emerald-900/10 pb-2.5 mb-3 text-xs">
                  <div className="h-6 w-6 rounded-full bg-emerald-700 flex items-center justify-center text-white text-[10px] font-bold">
                    AO
                  </div>
                  <div className="flex-1 truncate">
                    <div className="font-bold text-neutral-900 text-[11px]">{siteConfig.name} · Notificaciones</div>
                    <div className="text-[9px] text-neutral-600">Verificado · Automatizado</div>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>

                <div className="rounded-xl bg-white p-3 text-xs text-neutral-800 shadow-2xs space-y-2">
                  <p className="leading-snug">
                    Hola <strong>Matías</strong> 👋 Te recordamos tu cita médica para mañana a las <strong>11:30 hrs</strong> con la <strong>Dra. Soto</strong>.
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    ¿Confirmas tu asistencia para reservar tu box de atención?
                  </p>

                  <button
                    type="button"
                    onClick={() => setIsConfirmed(!isConfirmed)}
                    className={`w-full rounded-lg py-2 px-3 text-xs font-bold transition-all duration-micro flex items-center justify-center gap-1.5 ${
                      isConfirmed
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    {isConfirmed ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>¡Cita confirmada! (Sincronizado)</span>
                      </>
                    ) : (
                      <span>Toca aquí para confirmar cita</span>
                    )}
                  </button>
                </div>

                <div className="mt-2 text-right text-[10px] font-mono text-neutral-500">
                  Entregado 10:00 · Leído 10:01
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-neutral-500">
              Reduce hasta un <strong>65% las inasistencias</strong> sin que recepción gaste horas llamando.
            </div>
          </div>

          {/* Tarjeta 3 (Bento 5 columnas): Agenda Online 24/7 sin Topes */}
          <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 p-6 shadow-sm ring-1 ring-slate-100 transition-all duration-element hover:shadow-md lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--lp-sky-100)] text-[var(--lp-navy)]">
                  <Calendar className="h-5 w-5 text-action-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Reserva online 24/7</h3>
                  <p className="text-xs text-neutral-500">Tus pacientes eligen hora sin intermediarios</p>
                </div>
              </div>

              {/* Selector interactivo de slots */}
              <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
                  <span>Horas disponibles para hoy</span>
                  <span className="text-[11px] text-emerald-600 font-bold">Tiempo real</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {["09:00", "10:15", "11:30", "15:00", "16:30", "17:45"].map((slot) => {
                    const isOccupied = slot === "10:15" || slot === "15:00";
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-xl py-2 px-1 text-center font-mono text-xs font-semibold transition-all duration-micro ${
                          isOccupied
                            ? "bg-slate-100 text-neutral-400 line-through cursor-not-allowed border border-slate-200"
                            : isSelected
                            ? "bg-[var(--lp-navy)] text-white shadow-xs"
                            : "bg-slate-50 text-neutral-800 hover:bg-sky-50 hover:border-sky-300 border border-slate-200"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[var(--lp-navy)]" /> Seleccionada
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-300" /> Ocupada
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-neutral-500">
              Evita doble reserva de forma estricta a nivel de base de datos.
            </div>
          </div>

          {/* Tarjeta 4 (Bento 7 columnas): Métricas de Impacto con Contadores Animados */}
          <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 p-6 shadow-sm ring-1 ring-slate-100 transition-all duration-element hover:shadow-md lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Impacto en la operación clínica</h3>
                  <p className="text-xs text-neutral-500">Resultados promedio en consultas activas</p>
                </div>
              </div>

              {/* 3 Métricas con AnimatedNumber */}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-2xs">
                  <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 font-mono">
                    <AnimatedNumber value={65} format={(n) => `-${n}%`} />
                  </div>
                  <div className="mt-2 text-xs font-bold text-neutral-900">Menos ausencias</div>
                  <div className="mt-0.5 text-[11px] text-neutral-500">con aviso preventivo</div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-2xs">
                  <div className="text-3xl sm:text-4xl font-extrabold text-[var(--lp-navy)] font-mono">
                    <AnimatedNumber value={12} format={(n) => `+${n}h`} />
                  </div>
                  <div className="mt-2 text-xs font-bold text-neutral-900">Horas semanales</div>
                  <div className="mt-0.5 text-[11px] text-neutral-500">liberadas en recepción</div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-2xs">
                  <div className="text-3xl sm:text-4xl font-extrabold text-action-primary font-mono">
                    <AnimatedNumber value={100} format={(n) => `${n}%`} />
                  </div>
                  <div className="mt-2 text-xs font-bold text-neutral-900">Ley 20.584</div>
                  <div className="mt-0.5 text-[11px] text-neutral-500">seguridad de datos</div>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-neutral-500">
              Datos auditables y trazabilidad completa de cada acción de tu equipo.
            </div>
          </div>
        </div>
      </div>

      {/* Marquesina con desvanecimiento animado */}
      <div className="mt-14 border-y border-neutral-100 bg-neutral-50/70 py-5">
        <MarqueeFade pauseOnHover={true} className="[--marquee-duration:40s]">
          {marqueeItems.map(({ text, Icon }) => (
            <div
              key={text}
              className="flex items-center gap-2.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-2xs transition-all hover:scale-105 hover:border-[var(--lp-sky-200)] hover:shadow-xs select-none"
            >
              <Icon className="h-4 w-4 text-action-primary shrink-0" />
              <span className="whitespace-nowrap">{text}</span>
            </div>
          ))}
        </MarqueeFade>
      </div>
    </section>
  );
}
