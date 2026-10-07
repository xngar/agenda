import Link from "next/link";
import { Check } from "lucide-react";
import { landingPlans } from "@/lib/landing-plans";

export default function Pricing() {
  return (
    <section id="planes" className="bg-gradient-to-b from-[var(--lp-sky-100)] to-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--lp-navy)] sm:text-4xl">
            Un plan para cada consulta
          </h2>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {landingPlans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ${
                plan.highlighted ? "ring-[var(--lp-yellow)]" : "ring-[var(--lp-sky-200)]"
              }`}
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--lp-yellow)] px-3 py-1 text-xs font-semibold text-[var(--lp-navy)]">
                  Más elegido
                </span>
              ) : null}
              <h3 className="text-lg font-semibold text-[var(--lp-navy)]">{plan.name}</h3>
              <p className="mt-1 text-sm text-[var(--lp-navy)]/70">{plan.title}</p>
              <div className="mt-4 text-3xl font-bold text-[var(--lp-navy)]">{plan.price}</div>
              <ul className="mt-6 space-y-3 text-sm text-[var(--lp-navy)]">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-[var(--lp-blue)]" />
                  <span>Profesionales: {plan.professionals}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-[var(--lp-blue)]" />
                  <span>Agenda online ✓</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-[var(--lp-blue)]" />
                  <span>Ficha clínica ✓</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-[var(--lp-blue)]" />
                  <span>Recordatorios {plan.features.recordatorios ? "✓" : "[ ]"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-[var(--lp-blue)]" />
                  <span>Soporte: {plan.features.soporte}</span>
                </li>
              </ul>
              <Link
                href="#demo"
                className={`mt-8 rounded-full px-4 py-2 text-center text-sm font-semibold ${
                  plan.highlighted
                    ? "bg-[var(--lp-yellow)] text-[var(--lp-navy)] hover:bg-[var(--lp-yellow)]/90"
                    : "bg-[var(--lp-navy)] text-white hover:bg-[var(--lp-blue)]"
                }`}
              >
                Solicitar demo
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-[var(--lp-navy)]/80">
          ¿Necesitas algo distinto? Escríbenos y armamos un plan a tu medida.
        </p>
      </div>
    </section>
  );
}
