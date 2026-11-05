"use client";

import { MessageCircle, CalendarX2, FileText, Bell, Calendar, Users } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/motion/scroll-reveal";
import { motion } from "motion/react";
import { useMotionPrefs } from "@/components/motion/use-motion-prefs";

const easeCustom = [0.16, 1, 0.3, 1] as const;

export default function Problem() {
  const { reduce } = useMotionPrefs();

  return (
    <section className="bg-gradient-to-b from-white to-[var(--lp-sky-100)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ScrollReveal yOffset={16} className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-action-primary sm:text-4xl">
            ¿Tu consulta todavía depende de agendas, planillas y mensajes sueltos?
          </h2>
          <p className="mt-4 text-lg text-action-primary/90">
            Coordinar horas por WhatsApp, perder tiempo con las ausencias, buscar datos de un paciente entre papeles y archivos... Es tiempo que podrías dedicar a atender. {siteConfig.name} reúne todo en una sola plataforma, para que tu equipo trabaje con orden y tus pacientes tengan una mejor experiencia.
          </p>
        </ScrollReveal>

        {/* Mockup interactivo centrado */}
        <motion.div
          initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: easeCustom }}
          className="relative mx-auto mt-10 max-w-lg"
        >
          <div className="relative mx-auto max-w-lg rounded-2xl bg-white p-4 shadow-xl ring-1 ring-[var(--lp-sky-200)] transition-shadow duration-[300ms] hover:shadow-2xl">
            <div className="rounded-xl border border-[var(--lp-sky-200)] bg-gradient-to-b from-white to-[var(--lp-sky-100)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-action-primary">Agenda semanal</div>
                <div className="flex items-center gap-1.5 text-xs text-action-primary/70">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 badge-beacon" />
                  <span>En vivo</span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs">
                {["L", "M", "X", "J", "V"].map((d) => (
                  <div key={d} className="text-center font-medium text-action-primary/70">
                    {d}
                  </div>
                ))}
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg border border-[var(--lp-sky-200)] bg-white p-1 transition-transform duration-[150ms] hover:scale-105"
                  >
                    <div className="text-[10px] text-action-primary/50">{9 + i}:00</div>
                    {i === 1 ? (
                      <div className="mt-1 rounded-md bg-[var(--lp-yellow)]/40 px-1 py-0.5 text-[10px] font-medium text-action-primary shadow-xs">
                        Paciente A
                      </div>
                    ) : null}
                    {i === 3 ? (
                      <div className="mt-1 rounded-md bg-[var(--lp-blue)]/10 px-1 py-0.5 text-[10px] font-medium text-action-primary shadow-xs">
                        Paciente B
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm font-semibold text-action-primary">Pacientes</div>
              <div className="mt-2 space-y-2">
                {["Paciente A · Odontología", "Paciente B · Medicina"].map((p) => (
                  <div
                    key={p}
                    className="flex items-center justify-between rounded-lg border border-[var(--lp-sky-200)] bg-white px-2 py-1.5 text-xs transition-colors duration-[150ms] hover:bg-[var(--lp-sky-50)]"
                  >
                    <span className="font-medium text-action-primary">{p}</span>
                    <span className="font-mono text-action-primary/60">09:00</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Badge flotante derecha-top: Recordatorio */}
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, x: 20 }}
            animate={
              reduce
                ? { opacity: 1 }
                : { opacity: 1, x: 0, y: [-4, 4, -4] }
            }
            transition={
              reduce
                ? { duration: 0.3 }
                : {
                    opacity: { duration: 0.4, delay: 0.35 },
                    x: { duration: 0.4, delay: 0.35 },
                    y: { duration: 4.6, repeat: Infinity, ease: "easeInOut" },
                  }
            }
            className="absolute -right-4 top-6 hidden rounded-lg bg-white px-3 py-2 text-xs font-medium shadow-lg ring-1 ring-[var(--lp-sky-200)] transition-transform duration-[150ms] hover:scale-110 sm:block"
          >
            <div className="flex items-center gap-2 text-action-primary">
              <Bell className="h-4 w-4 text-[var(--lp-yellow)]" />
              <span>Recordatorio enviado</span>
            </div>
          </motion.div>

          {/* Badge flotante izquierda-bottom: Nueva reserva */}
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, x: -20 }}
            animate={
              reduce
                ? { opacity: 1 }
                : { opacity: 1, x: 0, y: [4, -4, 4] }
            }
            transition={
              reduce
                ? { duration: 0.3 }
                : {
                    opacity: { duration: 0.4, delay: 0.45 },
                    x: { duration: 0.4, delay: 0.45 },
                    y: { duration: 5.2, repeat: Infinity, ease: "easeInOut" },
                  }
            }
            className="absolute -left-4 bottom-10 hidden rounded-lg bg-white px-3 py-2 text-xs font-medium shadow-lg ring-1 ring-[var(--lp-sky-200)] transition-transform duration-[150ms] hover:scale-110 sm:block"
          >
            <div className="flex items-center gap-2 text-action-primary">
              <Calendar className="h-4 w-4 text-action-primary" />
              <span>Nueva reserva</span>
            </div>
          </motion.div>

          {/* Badge flotante derecha-bottom: Cita confirmada */}
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 15 }}
            animate={
              reduce
                ? { opacity: 1 }
                : { opacity: 1, y: [-3, 3, -3] }
            }
            transition={
              reduce
                ? { duration: 0.3 }
                : {
                    opacity: { duration: 0.4, delay: 0.55 },
                    y: { duration: 4.8, repeat: Infinity, ease: "easeInOut" },
                  }
            }
            className="absolute -right-2 bottom-2 hidden rounded-lg bg-white px-3 py-2 text-xs font-medium shadow-lg ring-1 ring-[var(--lp-sky-200)] transition-transform duration-[150ms] hover:scale-110 sm:block"
          >
            <div className="flex items-center gap-2 text-action-primary">
              <Users className="h-4 w-4 text-action-primary" />
              <span>Cita confirmada</span>
            </div>
          </motion.div>
        </motion.div>

        <StaggerGroup className="mt-14 grid gap-6 sm:grid-cols-3">
          {[
            { Icon: MessageCircle, text: "Mensajes por WhatsApp sin trazabilidad" },
            { Icon: CalendarX2, text: "Ausencias y reprogramaciones de última hora" },
            { Icon: FileText, text: "Datos dispersos entre papeles y archivos" },
          ].map(({ Icon, text }) => (
            <StaggerItem key={text} yOffset={20}>
              <div className="card-hover-lift flex h-full flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-[var(--lp-sky-200)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--lp-sky-100)] text-action-primary transition-transform duration-[150ms] hover:scale-110">
                  <Icon className="h-6 w-6 text-action-primary" />
                </div>
                <p className="mt-4 text-sm font-medium text-action-primary">{text}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
