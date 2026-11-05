"use client";

import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { CheckCircle2, Calendar, Users, Bell, Sparkles, ArrowRight, Mail } from "lucide-react";
import { motion } from "motion/react";
import { useMotionPrefs } from "@/components/motion/use-motion-prefs";

const easeCustom = [0.16, 1, 0.3, 1] as const;

export default function Hero() {
  const { reduce } = useMotionPrefs();

  return (
    <section
      id="top"
      className="relative h-screen w-full overflow-hidden"
    >
      {/* Imagen de fondo a pantalla completa */}
      <img
        src="/hero_pac.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      {/* Overlay degradado para legibilidad del texto */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/10" />

      <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        {/* Columna Izquierda: Mensajes con entrada escalonada */}
        <div>
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: easeCustom }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-xs font-semibold text-action-primary shadow-sm ring-1 ring-[var(--lp-sky-200)] transition-transform duration-micro hover:scale-105">
              <Sparkles className="h-3.5 w-3.5 text-action-primary" />
              Para odontólogos, médicos y psicólogos
            </span>
          </motion.div>

          <motion.h1
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: easeCustom }}
            className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Agenda, fichas clínicas y pacientes en un solo lugar.
          </motion.h1>

          <motion.p
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16, ease: easeCustom }}
            className="mt-5 max-w-2xl text-lg text-white/90"
          >
            {siteConfig.name} es la plataforma para clínicas y profesionales de la salud que quieren ordenar su consulta: reservas online, ficha clínica adaptada a su especialidad y recordatorios automáticos para sus pacientes.
          </motion.p>

          <motion.ul
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.24, ease: easeCustom }}
            className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {[
              "Reservas online",
              "Ficha clínica por especialidad",
              "Recordatorios automáticos",
              "Panel para tu equipo",
            ].map((item, idx) => (
              <motion.li
                key={item}
                initial={reduce ? { opacity: 1 } : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.28 + idx * 0.05,
                  ease: easeCustom,
                }}
                className="flex items-center gap-2 text-sm font-medium text-white"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />
                <span>{item}</span>
              </motion.li>
            ))}
          </motion.ul>

          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.36, ease: easeCustom }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href="#demo"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--lp-navy)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-micro hover:scale-105 hover:bg-[var(--lp-blue)] hover:shadow-md active:scale-95"
            >
              <span>Solicitar una demo</span>
              <ArrowRight className="h-4 w-4 btn-icon-right" aria-hidden="true" />
            </Link>
            <Link
              href={`mailto:${siteConfig.email}`}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-action-primary shadow-sm ring-1 ring-[var(--lp-sky-200)] transition-all duration-micro hover:scale-105 hover:bg-[var(--lp-sky-100)] active:scale-95"
            >
              <Mail className="h-4 w-4 btn-icon-wiggle" aria-hidden="true" />
              <span>Hablar con nuestro equipo</span>
            </Link>
          </motion.div>
        </div>

        {/* Columna Derecha: Mockup Interactivo con Flotación Suave (Parallax) */}
        <motion.div
          initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: easeCustom }}
          className="relative"
        >
          {/* Card Principal de Agenda */}
          <div className="relative mx-auto max-w-lg rounded-2xl bg-white p-4 shadow-xl ring-1 ring-[var(--lp-sky-200)] transition-shadow duration-element hover:shadow-2xl">
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
                    className="h-20 rounded-lg border border-[var(--lp-sky-200)] bg-white p-1 transition-transform duration-micro hover:scale-105"
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
                    className="flex items-center justify-between rounded-lg border border-[var(--lp-sky-200)] bg-white px-2 py-1.5 text-xs transition-colors duration-micro hover:bg-[var(--lp-sky-50)]"
                  >
                    <span className="text-action-primary font-medium">{p}</span>
                    <span className="text-action-primary/60 font-mono">09:00</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Badges Flotantes con microinteracción y animación continua desfasada */}
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, x: 20 }}
            animate={
              reduce
                ? { opacity: 1 }
                : {
                    opacity: 1,
                    x: 0,
                    y: [-4, 4, -4],
                  }
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
            className="absolute -right-4 top-6 hidden rounded-lg bg-white px-3 py-2 text-xs font-medium shadow-lg ring-1 ring-[var(--lp-sky-200)] transition-transform duration-micro hover:scale-110 sm:block"
          >
            <div className="flex items-center gap-2 text-action-primary">
              <Bell className="h-4 w-4 text-[var(--lp-yellow)]" />
              <span>Recordatorio enviado</span>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, x: -20 }}
            animate={
              reduce
                ? { opacity: 1 }
                : {
                    opacity: 1,
                    x: 0,
                    y: [4, -4, 4],
                  }
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
            className="absolute -left-4 bottom-10 hidden rounded-lg bg-white px-3 py-2 text-xs font-medium shadow-lg ring-1 ring-[var(--lp-sky-200)] transition-transform duration-micro hover:scale-110 sm:block"
          >
            <div className="flex items-center gap-2 text-action-primary">
              <Calendar className="h-4 w-4 text-action-primary" />
              <span>Nueva reserva</span>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 15 }}
            animate={
              reduce
                ? { opacity: 1 }
                : {
                    opacity: 1,
                    y: [-3, 3, -3],
                  }
            }
            transition={
              reduce
                ? { duration: 0.3 }
                : {
                    opacity: { duration: 0.4, delay: 0.55 },
                    y: { duration: 4.8, repeat: Infinity, ease: "easeInOut" },
                  }
            }
            className="absolute -right-2 bottom-2 hidden rounded-lg bg-white px-3 py-2 text-xs font-medium shadow-lg ring-1 ring-[var(--lp-sky-200)] transition-transform duration-micro hover:scale-110 sm:block"
          >
            <div className="flex items-center gap-2 text-action-primary">
              <Users className="h-4 w-4 text-action-primary" />
              <span>Cita confirmada</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
