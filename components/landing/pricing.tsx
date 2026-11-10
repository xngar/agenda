"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { landingPlans } from "@/lib/landing-plans";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/motion/scroll-reveal";

export default function Pricing() {
  return (
    <section id="planes" className="bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ScrollReveal yOffset={16} className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-800 sm:text-4xl">
            Un plan para cada consulta
          </h2>
        </ScrollReveal>
        <StaggerGroup className="mt-10 grid gap-6 lg:grid-cols-3">
          {landingPlans.map((plan) => (
            <StaggerItem key={plan.name} yOffset={24}>
              <article
                className={`card-hover-lift relative flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 transition-all duration-element ${
                  plan.highlighted
                    ? "ring-2 ring-[var(--lp-yellow)] shadow-md"
                    : "ring-[var(--lp-sky-200)]"
                }`}
              >
                {plan.highlighted ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[var(--lp-yellow)] px-3.5 py-1 text-xs font-semibold text-neutral-800 shadow-xs">
                    <Sparkles className="h-3 w-3 text-action-primary" />
                    Más elegido
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold text-neutral-800">{plan.name}</h3>
                <p className="mt-1 text-sm text-neutral-600">{plan.title}</p>
                <div className="mt-4 text-3xl font-bold text-neutral-800">{plan.price}</div>
                <ul className="mt-6 space-y-3 text-sm text-neutral-800 flex-1">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-action-primary" />
                    <span>Profesionales: {plan.professionals}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-action-primary" />
                    <span>Agenda online ✓</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-action-primary" />
                    <span>Ficha clínica ✓</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-action-primary" />
                    <span>Recordatorios {plan.features.recordatorios ? "✓" : "[ ]"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-action-primary" />
                    <span>Soporte: {plan.features.soporte}</span>
                  </li>
                </ul>
                <Link
                  href="#demo"
                  className={`mt-8 rounded-full px-4 py-2.5 text-center text-sm font-semibold transition-all duration-micro hover:scale-105 active:scale-95 ${
                    plan.highlighted
                      ? "bg-[var(--lp-yellow)] text-neutral-800 shadow-sm hover:bg-[var(--lp-yellow)]/90"
                      : "bg-[var(--lp-navy)] text-white shadow-sm hover:bg-[var(--lp-blue)]"
                  }`}
                >
                  Solicitar demo
                </Link>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
        <ScrollReveal delay={0.2} yOffset={12}>
          <p className="mt-8 text-center text-sm text-neutral-600">
            ¿Necesitas algo distinto? Escríbenos y armamos un plan a tu medida.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
