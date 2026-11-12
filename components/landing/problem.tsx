"use client";

import {
  MessageCircle,
  CalendarX2,
  FileText,
  Bell,
  Calendar,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/motion/scroll-reveal";
import { motion } from "motion/react";
import { useMotionPrefs } from "@/components/motion/use-motion-prefs";

const easeCustom = [0.16, 1, 0.3, 1] as const;

export default function Problem() {
  const { reduce } = useMotionPrefs();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-sky-50/30 to-white py-16 sm:py-24">
      {/* Luz ambiental sutil de fondo */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-sky-200/40 via-sky-100/20 to-transparent blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Encabezado con Eyebrow Badge y Tipografía de Alto Impacto */}
        <ScrollReveal yOffset={16} className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--lp-sky-200)] bg-white/90 px-3.5 py-1 text-xs font-semibold text-[var(--lp-navy)] shadow-2xs backdrop-blur-sm">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            <span>El diagnóstico de tu consulta</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl [text-wrap:balance]">
            ¿Tu consulta todavía depende de libretas, planillas y mensajes sueltos?
          </h2>

          <p className="mt-5 text-base sm:text-lg text-neutral-600 [text-wrap:balance]">
            Coordinar horas por WhatsApp, perder pacientes por inasistencias y buscar historiales clínicos en papel no solo desgasta a tu equipo: <strong>frena el crecimiento de tu clínica</strong>.
          </p>
        </ScrollReveal>

        {/* Comparativa Dinámica: Caos Tradicional vs. Control con Agenda Online */}
        <div className="mt-14 grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Columna Izquierda: Los 3 Puntos de Dolor de la Consulta Tradicional */}
          <div className="space-y-4 lg:col-span-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              La consulta tradicional sin sistema
            </div>

            <StaggerGroup className="space-y-3" staggerDelay={0.08}>
              {[
                {
                  Icon: MessageCircle,
                  title: "WhatsApp desordenado y sin registro",
                  desc: "Mensajes fuera de horario, horas perdidas y cero trazabilidad entre lo que habla recepción y lo que ve el profesional.",
                  color: "border-rose-100 bg-rose-50/40 text-rose-700",
                  iconBg: "bg-rose-100/80 text-rose-600",
                },
                {
                  Icon: CalendarX2,
                  title: "Ausencias y horas muertas",
                  desc: "Pacientes que olvidan su cita a último minuto sin confirmación previa, dejando boxes o sillones vacíos.",
                  color: "border-amber-100 bg-amber-50/40 text-amber-700",
                  iconBg: "bg-amber-100/80 text-amber-600",
                },
                {
                  Icon: FileText,
                  title: "Fichas dispersas en papel o carpetas",
                  desc: "Información médica fragmentada, riesgo de extravío y falta de cumplimiento de la normativa de respaldo.",
                  color: "border-slate-200 bg-white text-neutral-700",
                  iconBg: "bg-slate-100 text-neutral-700",
                },
              ].map(({ Icon, title, desc, color, iconBg }) => (
                <StaggerItem key={title} yOffset={16}>
                  <div
                    className={`rounded-2xl border p-4.5 transition-all duration-element hover:translate-x-1 hover:shadow-xs sm:p-5 ${color}`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
                        <p className="mt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>

          {/* Columna Derecha: Interfaz Viva y Activa de Agenda Online */}
          <div className="lg:col-span-7">
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Con {siteConfig.name}
              </div>
              <span className="text-xs font-medium text-neutral-500">Vista en vivo del panel</span>
            </div>

            <motion.div
              initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.97, y: 16 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: easeCustom }}
              className="relative rounded-3xl border border-[var(--lp-sky-200)]/80 bg-white/95 p-5 shadow-xl shadow-sky-900/5 backdrop-blur-md sm:p-7"
            >
              {/* Header de la agenda simulada */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--lp-navy)] text-white shadow-xs">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-neutral-900">Agenda Médica y Dental</div>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <span>Hoy, en consulta</span>
                      <span>·</span>
                      <span className="font-semibold text-emerald-600">4 de 5 horas confirmadas</span>
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/70">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 badge-beacon" />
                  <span>Sincronización activa</span>
                </div>
              </div>

              {/* Lista interactiva de citas de la jornada */}
              <div className="mt-5 space-y-2.5">
                {[
                  {
                    time: "09:00",
                    patient: "Camila Morales R.",
                    specialty: "Odontología · Limpieza & Evaluación",
                    doctor: "Dr. Silva",
                    status: "Confirmada",
                    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  },
                  {
                    time: "10:15",
                    patient: "Rodrigo Valenzuela T.",
                    specialty: "Medicina General · Control anual",
                    doctor: "Dra. Soto",
                    status: "En atención",
                    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
                  },
                  {
                    time: "11:30",
                    patient: "Sofía Cárdenas P.",
                    specialty: "Psicología · Sesión de avance",
                    doctor: "Ps. Morales",
                    status: "Recordatorio visto",
                    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
                  },
                  {
                    time: "12:45",
                    patient: "Ignacio Herrera B.",
                    specialty: "Odontología · Restauración pieza 19",
                    doctor: "Dr. Silva",
                    status: "Confirmada vía WhatsApp",
                    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  },
                ].map((item, idx) => (
                  <motion.div
                    key={item.time}
                    initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.05 * idx }}
                    className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-neutral-50/60 p-3 transition-all duration-micro hover:border-sky-200 hover:bg-white hover:shadow-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-white font-mono text-xs font-bold text-neutral-800 shadow-2xs border border-neutral-200/80">
                        {item.time}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">{item.patient}</div>
                        <div className="text-xs text-neutral-500">
                          {item.specialty} · <span className="font-medium text-neutral-700">{item.doctor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${item.badgeColor}`}>
                        <CheckCircle2 className="h-3 w-3" />
                        {item.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Tarjetas flotantes contextuales */}
              <motion.div
                initial={reduce ? { opacity: 1 } : { opacity: 0, x: 20 }}
                animate={
                  reduce
                    ? { opacity: 1 }
                    : { opacity: 1, x: 0, y: [-3, 3, -3] }
                }
                transition={
                  reduce
                    ? { duration: 0.3 }
                    : {
                        opacity: { duration: 0.4, delay: 0.3 },
                        x: { duration: 0.4, delay: 0.3 },
                        y: { duration: 4.8, repeat: Infinity, ease: "easeInOut" },
                      }
                }
                className="absolute -right-3 -top-5 hidden rounded-2xl border border-[var(--lp-sky-200)] bg-white px-3.5 py-2.5 text-xs font-medium shadow-lg sm:flex sm:items-center sm:gap-2.5 text-neutral-800"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Bell className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-neutral-900">WhatsApp automático</div>
                  <div className="text-[10px] text-neutral-500">Cita confirmada en 1 toque</div>
                </div>
              </motion.div>

              <motion.div
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: 15 }}
                animate={
                  reduce
                    ? { opacity: 1 }
                    : { opacity: 1, y: [3, -3, 3] }
                }
                transition={
                  reduce
                    ? { duration: 0.3 }
                    : {
                        opacity: { duration: 0.4, delay: 0.4 },
                        y: { duration: 5.2, repeat: Infinity, ease: "easeInOut" },
                      }
                }
                className="absolute -bottom-4 -left-3 hidden rounded-2xl border border-sky-100 bg-white px-3.5 py-2.5 text-xs font-medium shadow-lg sm:flex sm:items-center sm:gap-2.5 text-neutral-800"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--lp-sky-100)] text-[var(--lp-navy)]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-neutral-900">Ficha clínica lista</div>
                  <div className="text-[10px] text-neutral-500">Antecedentes precargados</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
