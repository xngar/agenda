"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "¿Para qué especialidades sirve?",
    a: "Hoy está pensada para odontología, medicina y psicología, con una ficha clínica adaptada a cada una.",
  },
  {
    q: "¿Mis pacientes necesitan descargar una app?",
    a: "[Completar]",
  },
  {
    q: "¿Puedo llevarme mis datos si dejo de usar el servicio?",
    a: "Sí. Puedes exportar la información de tu consulta.",
  },
  {
    q: "¿Cuánto demora ponerla en marcha?",
    a: "[Completar]",
  },
  {
    q: "¿Cómo contrato el servicio?",
    a: "Solicita una demo y nuestro equipo te contactará para explicarte los pasos.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="preguntas" className="bg-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--lp-navy)] sm:text-4xl">
            Preguntas frecuentes
          </h2>
        </div>
        <div className="mt-8 divide-y divide-[var(--lp-sky-200)] rounded-2xl bg-white ring-1 ring-[var(--lp-sky-200)]">
          {faqs.map((item, idx) => {
            const isOpen = open === idx;
            return (
              <div key={item.q}>
                <button
                  className="flex w-full items-center justify-between px-4 py-4 text-left sm:px-6"
                  onClick={() => setOpen(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-semibold text-[var(--lp-navy)] sm:text-base">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-[var(--lp-blue)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen ? (
                  <div className="px-4 pb-4 text-sm text-[var(--lp-navy)]/80 sm:px-6">
                    {item.a}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
