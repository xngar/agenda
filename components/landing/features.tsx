"use client";

import { Calendar, FileText, Bell, Users, Sparkles, Stethoscope, Brain } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "@/lib/site-config";
import { motion, AnimatePresence } from "motion/react";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/motion/scroll-reveal";
import { useMotionPrefs } from "@/components/motion/use-motion-prefs";

const features = [
  {
    title: "Agenda y reserva online",
    text: "Tus pacientes eligen su hora en línea, a cualquier hora del día. Tú controlas horarios, bloqueos y disponibilidad desde un solo calendario.",
    Icon: Calendar,
  },
  {
    title: "Ficha clínica por especialidad",
    text: "Se configura según el tipo de consulta.",
    Icon: FileText,
  },
  {
    title: "Recordatorios y notificaciones",
    text: "Avisos automáticos de citas a tus pacientes, para ayudar a reducir ausencias y reprogramaciones de última hora.",
    Icon: Bell,
  },
  {
    title: "Panel para profesionales y clínicas",
    text: "Vista clara de tu día, tus pacientes y la actividad de tu equipo, con accesos por rol (profesional, recepción, administrador).",
    Icon: Users,
  },
];

export default function Features() {
  const [tab, setTab] = useState<"odontologia" | "medicina" | "psicologia">("odontologia");
  const { reduce } = useMotionPrefs();

  return (
    <section id="funciones" className="bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ScrollReveal yOffset={16} className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-action-primary sm:text-4xl">
            Todo lo que tu consulta necesita
          </h2>
        </ScrollReveal>

        {/* Grilla de características con Stagger y Microinteracciones */}
        <StaggerGroup className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ title, text, Icon }) => (
            <StaggerItem key={title} yOffset={20}>
              <article className="card-hover-lift flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[var(--lp-sky-200)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--lp-sky-100)]/60 text-action-primary transition-colors duration-element group-hover:bg-[var(--lp-sky-200)]">
                  <Icon className="h-6 w-6 text-action-primary" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-action-primary">{title}</h3>
                <p className="mt-2 text-sm text-action-primary/80">{text}</p>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>

        {/* Sección Interactiva con Tabs Fluidos */}
        <ScrollReveal
          delay={0.15}
          yOffset={24}
          className="mt-12 rounded-2xl bg-gradient-to-b from-white to-[var(--lp-sky-100)] p-6 ring-1 ring-[var(--lp-sky-200)] sm:p-8"
        >
          {/* Navegador de Tabs con pastilla animada (layoutId) */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {(
              [
                { id: "odontologia", label: "Odontología" },
                { id: "medicina", label: "Medicina" },
                { id: "psicologia", label: "Psicología" },
              ] as const
            ).map(({ id, label }) => {
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-micro"
                  aria-selected={isActive}
                  role="tab"
                >
                  {isActive && !reduce ? (
                    <motion.div
                      layoutId="activeFeaturePill"
                      className="absolute inset-0 rounded-full bg-[var(--lp-navy)] shadow-sm"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  ) : null}
                  <span
                    className={`relative z-10 flex items-center gap-2 ${
                      isActive
                        ? "text-white"
                        : "text-action-primary hover:text-action-primary/80"
                    }`}
                  >
                    {id === "odontologia" ? (
                      <Sparkles className="h-4 w-4" />
                    ) : id === "medicina" ? (
                      <Stethoscope className="h-4 w-4" />
                    ) : (
                      <Brain className="h-4 w-4" />
                    )}
                    {label}
                  </span>
                  {!isActive ? (
                    <div className="absolute inset-0 rounded-full ring-1 ring-[var(--lp-sky-200)] bg-white -z-0 hover:bg-[var(--lp-sky-100)] transition-colors duration-micro" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Contenido animado al alternar pestañas */}
          <div className="mt-6 overflow-hidden rounded-xl border border-[var(--lp-sky-200)] bg-white p-5 shadow-sm">
            <AnimatePresence mode="wait">
              {tab === "odontologia" ? (
                <motion.div
                  key="odontologia"
                  initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h4 className="text-sm font-semibold text-action-primary">Ficha odontológica</h4>
                  <p className="mt-1 text-sm text-action-primary/80">
                    Odontograma, plan de tratamiento y registro por pieza dental.
                  </p>
                  <div className="mt-4 flex h-40 items-center justify-center rounded-lg border border-dashed border-[var(--lp-sky-200)] bg-[var(--lp-sky-100)]/40 p-3 text-xs text-action-primary/60">
                    Mockup de ficha odontológica · {siteConfig.name}
                  </div>
                </motion.div>
              ) : null}
              {tab === "medicina" ? (
                <motion.div
                  key="medicina"
                  initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h4 className="text-sm font-semibold text-action-primary">Ficha médica</h4>
                  <p className="mt-1 text-sm text-action-primary/80">
                    Signos vitales, examen físico, diagnósticos y recetas.
                  </p>
                  <div className="mt-4 flex h-40 items-center justify-center rounded-lg border border-dashed border-[var(--lp-sky-200)] bg-[var(--lp-sky-100)]/40 p-3 text-xs text-action-primary/60">
                    Mockup de ficha médica · {siteConfig.name}
                  </div>
                </motion.div>
              ) : null}
              {tab === "psicologia" ? (
                <motion.div
                  key="psicologia"
                  initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h4 className="text-sm font-semibold text-action-primary">Ficha psicológica</h4>
                  <p className="mt-1 text-sm text-action-primary/80">
                    Historia del paciente, notas de sesión y seguimiento, con notas privadas visibles solo para el terapeuta.
                  </p>
                  <div className="mt-4 flex h-40 items-center justify-center rounded-lg border border-dashed border-[var(--lp-sky-200)] bg-[var(--lp-sky-100)]/40 p-3 text-xs text-action-primary/60">
                    Mockup de ficha psicológica · {siteConfig.name}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
