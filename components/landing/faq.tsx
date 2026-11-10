"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  {
    q: "¿Ofrecen soporte y capacitación inicial?",
    a: "Sí. Te acompañamos a ti y a tu equipo en la configuración inicial y resolución de dudas.",
  },
];

export default function Faq() {
  const col1 = faqs.slice(0, 3);
  const col2 = faqs.slice(3, 6);

  return (
    <section id="preguntas" className="bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-800 sm:text-4xl">
            Preguntas frecuentes
          </h2>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12">
          <Accordion type="single" collapsible className="w-full">
            {col1.map((item, idx) => (
              <AccordionItem key={item.q} value={`col1-${idx}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <Accordion type="single" collapsible className="w-full">
            {col2.map((item, idx) => (
              <AccordionItem key={item.q} value={`col2-${idx}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
