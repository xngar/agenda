"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

const faqs = [
  {
    q: "¿Para qué especialidades sirve?",
    a: "Odontología, medicina general y psicología, con odontograma, signos vitales y notas de evolución. También se adapta a kinesiología, nutrición y fonoaudiología.",
  },
  {
    q: "¿Mis pacientes necesitan descargar una app?",
    a: "No. Reservan desde el navegador con un enlace, sin descargas ni contraseñas.",
  },
  {
    q: "¿Puedo llevarme mis datos si dejo el servicio?",
    a: "Sí. Puedes descargar las fichas en PDF y exportar pacientes y citas en CSV cuando quieras.",
  },
  {
    q: "¿Ofrecen capacitación y soporte?",
    a: "Sí. Capacitamos a tu equipo y damos soporte por WhatsApp y correo.",
  },
];

export default function Faq() {
  const col1 = faqs.slice(0, 2);
  const col2 = faqs.slice(2, 4);

  return (
    <section id="preguntas" className="relative bg-white py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <ScrollReveal yOffset={16} className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl [text-wrap:balance]">
            Preguntas frecuentes
          </h2>
        </ScrollReveal>

        {/* Acordeón en 2 Columnas */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full space-y-3">
              {col1.map((item, idx) => (
                <AccordionItem
                  key={item.q}
                  value={`col1-${idx}`}
                  className="rounded-2xl border border-slate-200/90 bg-slate-50/50 px-5 py-1 transition-all duration-micro hover:bg-slate-50/90 hover:border-slate-300"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base font-bold text-neutral-900 hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-neutral-600 leading-relaxed pt-1 pb-3">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full space-y-3">
              {col2.map((item, idx) => (
                <AccordionItem
                  key={item.q}
                  value={`col2-${idx}`}
                  className="rounded-2xl border border-slate-200/90 bg-slate-50/50 px-5 py-1 transition-all duration-micro hover:bg-slate-50/90 hover:border-slate-300"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base font-bold text-neutral-900 hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-neutral-600 leading-relaxed pt-1 pb-3">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
