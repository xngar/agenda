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
    q: "¿Para qué especialidades médicas o de salud sirve?",
    a: "Está especialmente optimizada para odontología, medicina general y psicología, contando con odontograma interactivo, registro de signos vitales y notas de evolución protegidas. También se adapta fluidamente a consultas de kinesiología, nutrición y fonoaudiología.",
  },
  {
    q: "¿Mis pacientes necesitan descargar alguna aplicación?",
    a: "No. Tus pacientes reservan directamente desde cualquier navegador móvil o de escritorio a través de un enlace web seguro y rápido, sin descargas obligatorias, sin publicidad y sin crear contraseñas engorrosas.",
  },
  {
    q: "¿Puedo exportar y llevarme mis datos si dejo de usar el servicio?",
    a: "Sí, absolutamente. La información de tu clínica y de tus pacientes te pertenece en un 100%. Puedes descargar las historias clínicas en formato PDF y exportar pacientes y citas en CSV en cualquier momento.",
  },
  {
    q: "¿Cuánto tiempo demora poner la plataforma en marcha?",
    a: "Menos de 24 horas. Nuestro equipo te entrega la cuenta completamente configurada con tus profesionales, horarios, boxes y fichas adaptadas para que puedas comenzar a agendar inmediatamente.",
  },
  {
    q: "¿Cómo se contrata el servicio?",
    a: "Solo debes solicitar una demo en el formulario inferior. Coordinaremos una breve sesión demostrativa de 15 minutos para resolver tus dudas y habilitar tu acceso con acompañamiento personalizado.",
  },
  {
    q: "¿Ofrecen capacitación al equipo y soporte técnico continuo?",
    a: "Sí. Incluimos inducción guiada tanto para los profesionales de salud como para el personal de recepción, además de soporte prioritario vía WhatsApp y correo electrónico para resolver cualquier consulta en tu jornada.",
  },
];

export default function Faq() {
  const col1 = faqs.slice(0, 3);
  const col2 = faqs.slice(3, 6);

  return (
    <section id="preguntas" className="relative bg-white py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <ScrollReveal yOffset={16} className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl [text-wrap:balance]">
            Preguntas frecuentes
          </h2>

          <p className="mt-5 text-base sm:text-lg text-neutral-600 [text-wrap:balance]">
            Todo lo que necesitas saber antes de dar el paso hacia una consulta moderna y ordenada.
          </p>
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
