"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { landingPlans } from "@/lib/landing-plans";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/motion/scroll-reveal";

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="planes" className="relative overflow-hidden bg-slate-50/60 py-16 sm:py-24 border-t border-slate-200/60">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <ScrollReveal yOffset={16} className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl [text-wrap:balance]">
            Un plan pensado para la escala de tu consulta
          </h2>

          <p className="mt-5 text-base sm:text-lg text-neutral-600 [text-wrap:balance]">
            Sin costos de instalación ocultos ni contratos que te aten. Activa tu consulta y escala cuando tu equipo crezca.
          </p>

          {/* Toggle Mensual / Anual */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white p-1.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-micro ${
                !isAnnual
                  ? "bg-[var(--lp-navy)] text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Facturación Mensual
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-micro ${
                isAnnual
                  ? "bg-[var(--lp-navy)] text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <span>Pago Anual</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Ahorra 20%
              </span>
            </button>
          </div>
        </ScrollReveal>

        {/* Grilla de Planes */}
        <StaggerGroup className="mt-12 grid gap-8 lg:grid-cols-3" staggerDelay={0.08}>
          {landingPlans.map((plan) => {
            const price = isAnnual ? plan.priceYearly : plan.priceMonthly;
            const period = isAnnual ? plan.periodYearly : plan.periodMonthly;

            return (
              <StaggerItem key={plan.name} yOffset={24}>
                <article
                  className={`relative flex h-full flex-col justify-between rounded-3xl bg-white p-7 shadow-sm transition-all duration-element hover:-translate-y-1 ${
                    plan.highlighted
                      ? "border-2 border-[var(--lp-blue)] shadow-xl ring-4 ring-[var(--lp-blue)]/10"
                      : "border border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-[var(--lp-blue)] px-4 py-1 text-xs font-bold text-white shadow-md">
                      <Sparkles className="h-3 w-3 text-cyan-200" />
                      Más elegido por clínicas
                    </span>
                  )}

                  <div>
                    <h3 className="text-xl font-bold text-neutral-900">{plan.name}</h3>
                    <p className="mt-1.5 text-xs text-neutral-500 min-h-[2rem] leading-relaxed">
                      {plan.title}
                    </p>

                    <div className="mt-6 flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold tracking-tight text-neutral-900 font-mono">
                        {price}
                      </span>
                      <span className="text-xs text-neutral-500 font-medium">
                        {period}
                      </span>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
                        Capacidad & Servicios
                      </div>
                      <ul className="space-y-3 text-sm text-neutral-700">
                        <li className="flex items-start gap-2.5">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span className="font-semibold text-neutral-900">{plan.professionals}</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>Agenda y reservas online 24/7</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>Ficha clínica electrónica adaptada</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <Check
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              plan.features.recordatoriosWhatsApp ? "text-emerald-600" : "text-neutral-300"
                            }`}
                          />
                          <span className={plan.features.recordatoriosWhatsApp ? "text-neutral-900" : "text-neutral-400"}>
                            Recordatorios automáticos WhatsApp y email
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <Check
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              plan.features.multiRol ? "text-emerald-600" : "text-neutral-300"
                            }`}
                          />
                          <span className={plan.features.multiRol ? "text-neutral-900" : "text-neutral-400"}>
                            Accesos multi-rol (Recepción y Profesional)
                          </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span className="text-neutral-600">{plan.features.soporte}</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100">
                    <Link
                      href="#demo"
                      className={`flex w-full items-center justify-center gap-2 rounded-full py-3 px-4 text-center text-sm font-bold transition-all duration-micro hover:scale-[1.02] active:scale-[0.98] ${
                        plan.highlighted
                          ? "bg-[var(--lp-navy)] text-white shadow-md hover:bg-[var(--lp-blue)]"
                          : "bg-slate-100 text-neutral-800 hover:bg-slate-200"
                      }`}
                    >
                      <span>Solicitar demo guiada</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </StaggerGroup>

        <ScrollReveal delay={0.2} yOffset={12}>
          <div className="mt-12 text-center text-xs sm:text-sm text-neutral-600">
            ¿Tu centro de salud cuenta con múltiples sucursales o más de 20 especialistas?{" "}
            <Link href="#demo" className="font-bold text-[var(--lp-blue)] underline hover:text-[var(--lp-navy)]">
              Escríbenos para un plan corporativo a la medida
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
