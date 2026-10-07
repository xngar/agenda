"use client";

import { Calendar, FileText, Bell, Users, Sparkles, Stethoscope, Brain } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "@/lib/site-config";

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

  return (
    <section id="funciones" className="bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--lp-navy)] sm:text-4xl">
            Todo lo que tu consulta necesita
          </h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ title, text, Icon }) => (
            <article
              key={title}
              className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[var(--lp-sky-200)]"
            >
              <Icon className="h-7 w-7 text-[var(--lp-blue)]" />
              <h3 className="mt-3 text-base font-semibold text-[var(--lp-navy)]">{title}</h3>
              <p className="mt-2 text-sm text-[var(--lp-navy)]/80">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-12 rounded-2xl bg-gradient-to-b from-white to-[var(--lp-sky-100)] p-6 ring-1 ring-[var(--lp-sky-200)] sm:p-8">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {(
              [
                { id: "odontologia", label: "Odontología" },
                { id: "medicina", label: "Medicina" },
                { id: "psicologia", label: "Psicología" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  tab === id
                    ? "bg-[var(--lp-navy)] text-white"
                    : "bg-white text-[var(--lp-navy)] ring-1 ring-[var(--lp-sky-200)] hover:bg-[var(--lp-sky-100)]"
                }`}
                aria-selected={tab === id}
                role="tab"
              >
                {id === "odontologia" ? <Sparkles className="h-4 w-4" /> : id === "medicina" ? <Stethoscope className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
                {label}
              </button>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-[var(--lp-sky-200)] bg-white p-4 shadow-sm">
            {tab === "odontologia" ? (
              <div>
                <h4 className="text-sm font-semibold text-[var(--lp-navy)]">Ficha odontológica</h4>
                <p className="mt-1 text-sm text-[var(--lp-navy)]/80">
                  Odontograma, plan de tratamiento y registro por pieza dental.
                </p>
                <div className="mt-4 h-40 rounded-lg border border-dashed border-[var(--lp-sky-200)] bg-[var(--lp-sky-100)]/40 p-3 text-xs text-[var(--lp-navy)]/60">
                  Mockup de ficha odontológica · {siteConfig.name}
                </div>
              </div>
            ) : null}
            {tab === "medicina" ? (
              <div>
                <h4 className="text-sm font-semibold text-[var(--lp-navy)]">Ficha médica</h4>
                <p className="mt-1 text-sm text-[var(--lp-navy)]/80">
                  Signos vitales, examen físico, diagnósticos y recetas.
                </p>
                <div className="mt-4 h-40 rounded-lg border border-dashed border-[var(--lp-sky-200)] bg-[var(--lp-sky-100)]/40 p-3 text-xs text-[var(--lp-navy)]/60">
                  Mockup de ficha médica · {siteConfig.name}
                </div>
              </div>
            ) : null}
            {tab === "psicologia" ? (
              <div>
                <h4 className="text-sm font-semibold text-[var(--lp-navy)]">Ficha psicológica</h4>
                <p className="mt-1 text-sm text-[var(--lp-navy)]/80">
                  Historia del paciente, notas de sesión y seguimiento, con notas privadas visibles solo para el terapeuta.
                </p>
                <div className="mt-4 h-40 rounded-lg border border-dashed border-[var(--lp-sky-200)] bg-[var(--lp-sky-100)]/40 p-3 text-xs text-[var(--lp-navy)]/60">
                  Mockup de ficha psicológica · {siteConfig.name}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
