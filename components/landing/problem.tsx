"use client";

import { useEffect, useRef, useState } from "react";
import {
  Globe,
  CalendarCheck,
  LayoutDashboard,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight,
  User,
  Check,
} from "lucide-react";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/motion/scroll-reveal";
import { motion, AnimatePresence } from "motion/react";
import { useMotionPrefs } from "@/components/motion/use-motion-prefs";

const easeCustom = [0.16, 1, 0.3, 1] as const;

export default function Problem() {
  const { reduce } = useMotionPrefs();
  const [activeTab, setActiveTab] = useState<"patient" | "clinic">("patient");
  const [selectedSlot, setSelectedSlot] = useState<string>("09:45");
  const [simulatedConfirmed, setSimulatedConfirmed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-sky-50/25 to-white py-16 sm:py-24">
      {/* Luz ambiental sutil de fondo */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-sky-200/40 via-sky-100/20 to-transparent blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Encabezado Principal */}
        <ScrollReveal yOffset={16} className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl [text-wrap:balance]">
            Tus pacientes reservan solos. Tú solo confirmas.
          </h2>

          <p className="mt-5 text-base sm:text-lg text-neutral-600 [text-wrap:balance]">
            Reserva online en menos de un minuto, sin apps ni cuentas.
          </p>
        </ScrollReveal>

        {/* Estructura en 2 Columnas: Los 3 Pasos del Flujo (Izq) + Simulación Interactiva Dual (Der) */}
        <div className="mt-14 grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Columna Izquierda: Los 3 Pasos del Flujo Simplificado */}
          <div className="space-y-4 lg:col-span-5">
            <StaggerGroup className="space-y-3" staggerDelay={0.08}>
              {[
                {
                  step: "01",
                  Icon: Globe,
                  title: "Reserva desde tu enlace",
                  desc: "Elige servicio, profesional y hora. Sin apps ni contraseñas.",
                  color: "border-sky-100 bg-sky-50/40 text-neutral-800",
                  iconBg: "bg-sky-100 text-[var(--lp-navy)]",
                },
                {
                  step: "02",
                  Icon: CalendarCheck,
                  title: "Sin horas duplicadas",
                  desc: "Revisamos horarios, feriados y bloqueos. Una hora tomada no se ofrece a nadie más.",
                  color: "border-emerald-100 bg-emerald-50/30 text-neutral-800",
                  iconBg: "bg-emerald-100 text-emerald-800",
                },
                {
                  step: "03",
                  Icon: LayoutDashboard,
                  title: "Confirmas en 1 clic",
                  desc: "La cita llega como 'por confirmar'. Al confirmarla, el paciente recibe su evento de calendario.",
                  color: "border-slate-200 bg-white text-neutral-800",
                  iconBg: "bg-neutral-100 text-neutral-800",
                },
              ].map(({ step, Icon, title, desc, color, iconBg }) => (
                <StaggerItem key={step} yOffset={16}>
                  <div
                    className={`rounded-2xl border p-4.5 transition-all duration-element hover:translate-x-1 hover:shadow-xs sm:p-5 ${color}`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${iconBg}`}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
                          <span className="font-mono text-xs font-bold text-neutral-400">{step}</span>
                        </div>
                        <p className="mt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>

          {/* Columna Derecha: Mockup Interactivo Dual (Paciente vs Clínica) */}
          <div className="lg:col-span-7">
            {/* Selector de Pestañas Interactivas */}
            <div className="mb-3 flex items-center justify-between px-1">
              <div
                role="tablist"
                aria-label="Selector de simulación de flujo"
                className="inline-flex rounded-xl bg-neutral-100 p-1 text-xs font-semibold text-neutral-600 shadow-inner"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "patient"}
                  onClick={() => setActiveTab("patient")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all duration-micro cursor-pointer ${
                    activeTab === "patient"
                      ? "bg-white text-[var(--lp-navy)] shadow-xs font-bold"
                      : "hover:text-neutral-900"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                  <span>Paciente</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "clinic"}
                  onClick={() => setActiveTab("clinic")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all duration-micro cursor-pointer ${
                    activeTab === "clinic"
                      ? "bg-white text-[var(--lp-navy)] shadow-xs font-bold"
                      : "hover:text-neutral-900"
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Clínica</span>
                </button>
              </div>
            </div>

            {/* Contenedor del Mockup */}
            <motion.div
              initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.98, y: 16 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: easeCustom }}
              className="relative rounded-3xl border border-[var(--lp-sky-200)]/80 bg-white/95 p-5 shadow-xl shadow-sky-900/5 backdrop-blur-md sm:p-7 min-h-[460px] flex flex-col justify-between"
            >
              <AnimatePresence mode="wait">
                {activeTab === "patient" ? (
                  /* VISTA 1: El paciente reservando en la web */
                  <motion.div
                    key="tab-patient"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    {/* Barra de Navegación del Asistente */}
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200/60">
                          <Lock className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                          <span>agendaonline.cl/clinica-sonrisa/reservar</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-neutral-500">Paso 3 de 3</span>
                    </div>

                    {/* Resumen de Selección */}
                    <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-medium text-neutral-500">Profesional & Servicio</div>
                          <div className="text-sm font-bold text-neutral-900">Dra. Valentina Soto</div>
                          <div className="text-xs text-neutral-600">Odontología · Evaluación & Limpieza (45 min)</div>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-700 border border-neutral-200/80 shadow-2xs">
                          Miércoles 14 Nov
                        </span>
                      </div>
                    </div>

                    {/* Selector interactivo de horas disponibles en vivo */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                          Horas disponibles
                        </span>
                        <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          En vivo
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { time: "09:00", available: false, label: "Ocupada" },
                          { time: "09:45", available: true, label: "Disponible" },
                          { time: "10:30", available: true, label: "Disponible" },
                          { time: "11:15", available: true, label: "Disponible" },
                        ].map((slot) => {
                          const isSelected = selectedSlot === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => setSelectedSlot(slot.time)}
                              className={`group relative flex flex-col items-center justify-center rounded-xl p-2.5 text-center transition-all duration-micro ${
                                !slot.available
                                  ? "border border-neutral-200/60 bg-neutral-100/60 text-neutral-400 cursor-not-allowed opacity-60"
                                  : isSelected
                                    ? "border-2 border-[var(--lp-navy)] bg-sky-50 text-[var(--lp-navy)] shadow-xs font-bold"
                                    : "border border-neutral-200 bg-white text-neutral-700 hover:border-sky-300 hover:bg-sky-50/40 cursor-pointer"
                              }`}
                            >
                              <div className="font-mono text-sm font-bold">{slot.time}</div>
                              <div className="text-[10px] mt-0.5">
                                {isSelected ? "Seleccionada" : slot.label}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Botón de acción simulada */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab("clinic")}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--lp-navy)] py-3 px-4 text-sm font-bold text-white shadow-sm hover:bg-[var(--lp-navy-deep)] transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <span>Reservar hora</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* VISTA 2: El profesional gestionando la cita en la agenda */
                  <motion.div
                    key="tab-clinic"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    {/* Header de la agenda médica */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--lp-navy)] text-white shadow-xs">
                          <Calendar className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-neutral-900">Agenda · Miércoles 14 Nov</div>
                          <div className="text-xs text-neutral-500">Dra. Valentina Soto (Sillón 1)</div>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Sincronización en vivo</span>
                      </div>
                    </div>

                    {/* Lista interactiva de citas en el panel */}
                    <div className="space-y-2.5">
                      {/* Cita asignada desde la web */}
                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-white font-mono text-xs font-bold text-[var(--lp-navy)] shadow-2xs border border-amber-200">
                              {selectedSlot}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-neutral-900">Camila Morales R.</span>
                                <span className="text-xs text-neutral-500">· 11.234.567-8</span>
                              </div>
                              <div className="text-xs text-neutral-600">
                                Odontología · Evaluación & Limpieza (Entró vía Web)
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {simulatedConfirmed ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                <Check className="h-3 w-3" />
                                Confirmada
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSimulatedConfirmed(true)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lp-navy)] px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-[var(--lp-navy-deep)] transition-all cursor-pointer"
                              >
                                <span>Confirmar cita</span>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Cita 2 (Preexistente confirmada) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-neutral-100 bg-neutral-50/60 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-white font-mono text-xs font-bold text-neutral-800 shadow-2xs border border-neutral-200/80">
                            10:30
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-neutral-900">Rodrigo Valenzuela T.</div>
                            <div className="text-xs text-neutral-500">Medicina General · Control anual</div>
                          </div>
                        </div>
                        <span className="self-start sm:self-center inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Confirmada
                        </span>
                      </div>

                      {/* Cita 3 (En atención) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-neutral-100 bg-neutral-50/60 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-white font-mono text-xs font-bold text-neutral-800 shadow-2xs border border-neutral-200/80">
                            11:15
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-neutral-900">Sofía Cárdenas P.</div>
                            <div className="text-xs text-neutral-500">Psicología · Sesión de avance</div>
                          </div>
                        </div>
                        <span className="self-start sm:self-center inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                          <User className="h-3 w-3" />
                          En atención
                        </span>
                      </div>
                    </div>

                    {/* Resumen de gestión */}
                    <div className="pt-2 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-100">
                      <span>3 citas agendadas hoy</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSimulatedConfirmed(false);
                          setActiveTab("patient");
                        }}
                        className="text-sky-700 font-semibold hover:underline cursor-pointer"
                      >
                        ← Volver a simular reserva web
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        <ScrollReveal yOffset={20} className="mx-auto mt-16 w-[90%] max-w-[64.8rem] sm:mt-20">
          <div className="overflow-hidden rounded-[30px] bg-neutral-950 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5">
            <video
              ref={videoRef}
              src="/brag.mp4"
              muted
              playsInline
              loop
              preload="metadata"
              aria-label="Demostración visual de la plataforma"
              className="block h-auto w-full rounded-[30px] object-cover pointer-events-none select-none"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
