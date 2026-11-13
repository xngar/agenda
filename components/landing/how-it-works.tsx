"use client";

import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/motion/scroll-reveal";
import { Calendar, Settings, Rocket, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Demo de 15 minutos",
      time: "15 minutos",
      desc: "Revisamos el flujo de tu clínica por videollamada.",
      Icon: Calendar,
    },
    {
      n: "02",
      title: "Configuramos tu cuenta",
      time: "Menos de 24 hrs",
      desc: "Profesionales, horarios, boxes y fichas por especialidad.",
      Icon: Settings,
    },
    {
      n: "03",
      title: "Comparte tu enlace",
      time: "Inmediato",
      desc: "Tus pacientes ya pueden reservar.",
      Icon: Rocket,
    },
  ];

  return (
    <section id="como-funciona" className="relative overflow-hidden bg-slate-50/70 py-16 sm:py-24 border-y border-slate-200/60">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <ScrollReveal yOffset={16} className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl [text-wrap:balance]">
            Empieza en menos de 24 horas
          </h2>
        </ScrollReveal>

        {/* Timeline con tarjetas conectadas */}
        <div className="relative mt-14">
          {/* Línea conectora horizontal para pantallas grandes */}
          <div
            className="pointer-events-none absolute left-12 right-12 top-10 hidden h-0.5 bg-gradient-to-r from-[var(--lp-navy)] via-[var(--lp-blue)] to-action-primary opacity-20 lg:block"
            aria-hidden="true"
          />

          <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.1}>
            {steps.map((step) => {
              const Icon = step.Icon;
              return (
                <StaggerItem key={step.n} yOffset={20}>
                  <article className="group relative flex h-full flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-sm transition-all duration-element hover:-translate-y-1 hover:border-[var(--lp-sky-200)] hover:shadow-lg">
                    <div>
                      {/* Cabecera con número grande y tiempo */}
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lp-navy)] text-base font-bold text-white shadow-xs transition-transform duration-micro group-hover:scale-105">
                          {step.n}
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-neutral-700">
                          {step.time}
                        </span>
                      </div>

                      <div className="mt-6 flex items-center gap-2">
                        <Icon className="h-5 w-5 text-action-primary" />
                        <h3 className="text-xl font-bold text-neutral-900">{step.title}</h3>
                      </div>

                      <p className="mt-3 text-sm text-neutral-600 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </article>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </div>

        {/* CTA Intermedio */}
        <ScrollReveal delay={0.2} yOffset={12} className="mt-12 text-center">
          <Link
            href="#demo"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--lp-navy)] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all duration-micro hover:scale-105 hover:bg-[var(--lp-blue)]"
          >
            <span>Solicitar demo</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
