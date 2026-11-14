"use client";

import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/motion/scroll-reveal";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Demo de 15 minutos",
      desc: "Revisamos el flujo de tu consulta por videollamada.",
    },
    {
      n: "02",
      title: "Configuramos tu cuenta",
      desc: "Dejamos listos tus profesionales, horarios y fichas en menos de 24 horas.",
    },
    {
      n: "03",
      title: "Comparte tu enlace",
      desc: "Tus pacientes reservan en línea desde el primer día.",
    },
  ];

  return (
    <section id="como-funciona" className="relative bg-white py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal yOffset={16} className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl [text-wrap:balance]">
            Empieza en menos de 24 horas
          </h2>
        </ScrollReveal>

        <StaggerGroup className="mt-14 grid gap-6 sm:grid-cols-3" staggerDelay={0.1}>
          {steps.map((step) => (
            <StaggerItem key={step.n} yOffset={20}>
              <article className="flex h-full flex-col justify-between rounded-3xl border border-neutral-200/80 bg-neutral-50/50 p-7 sm:p-8">
                <div>
                  <span className="font-mono text-xs font-semibold text-neutral-400">
                    {step.n}
                  </span>
                  <h3 className="mt-3 text-xl font-bold text-neutral-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                    {step.desc}
                  </p>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>

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
