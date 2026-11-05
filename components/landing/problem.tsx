"use client";

import { MessageCircle, CalendarX2, FileText } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/motion/scroll-reveal";

export default function Problem() {
  return (
    <section className="bg-gradient-to-b from-white to-[var(--lp-sky-100)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ScrollReveal yOffset={16} className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-action-primary sm:text-4xl">
            ¿Tu consulta todavía depende de agendas, planillas y mensajes sueltos?
          </h2>
          <p className="mt-4 text-lg text-action-primary/90">
            Coordinar horas por WhatsApp, perder tiempo con las ausencias, buscar datos de un paciente entre papeles y archivos... Es tiempo que podrías dedicar a atender. {siteConfig.name} reúne todo en una sola plataforma, para que tu equipo trabaje con orden y tus pacientes tengan una mejor experiencia.
          </p>
        </ScrollReveal>
        <StaggerGroup className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { Icon: MessageCircle, text: "Mensajes por WhatsApp sin trazabilidad" },
            { Icon: CalendarX2, text: "Ausencias y reprogramaciones de última hora" },
            { Icon: FileText, text: "Datos dispersos entre papeles y archivos" },
          ].map(({ Icon, text }) => (
            <StaggerItem key={text} yOffset={20}>
              <div className="card-hover-lift flex h-full flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-[var(--lp-sky-200)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--lp-sky-100)] text-action-primary transition-transform duration-micro hover:scale-110">
                  <Icon className="h-6 w-6 text-action-primary" />
                </div>
                <p className="mt-4 text-sm font-medium text-action-primary">{text}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
