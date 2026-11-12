"use client";

import { ShieldCheck, Lock, Database, Download, FileCheck, CheckCircle2, ShieldAlert, Award } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/motion/scroll-reveal";

export default function Security() {
  const securityPillars = [
    {
      Icon: Lock,
      title: "Control de acceso estricto por roles",
      desc: "El profesional atiende con su ficha, recepción solo administra la agenda y citas, y el administrador gestiona el equipo.",
      badge: "RLS a nivel de BD",
    },
    {
      Icon: FileCheck,
      title: "Registro de auditoría inmutable",
      desc: "Trazabilidad completa: queda registrado quién, cuándo y desde dónde se consultó o modificó cada ficha médica.",
      badge: "Auditoría activa",
    },
    {
      Icon: Database,
      title: "Cifrado y copias de seguridad",
      desc: "Toda la información se transmite bajo TLS 1.3 y se almacena cifrada con respaldos automáticos diarios.",
      badge: "Cifrado AES-256",
    },
    {
      Icon: Download,
      title: "Tus datos te pertenecen al 100%",
      desc: "Sin amarras ni bloqueos. Puedes exportar fichas, historiales y contactos en formatos estándar (PDF, CSV) cuando lo desees.",
      badge: "Exportación 1 clic",
    },
  ];

  return (
    <section id="seguridad" className="relative bg-white py-16 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Contenedor institucional de alto impacto visual (Deep Navy) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B2A5B] via-[#081f44] to-[#040e1f] px-6 py-12 text-white shadow-2xl sm:px-12 sm:py-16">
          {/* Luz ambiental sutil de fondo */}
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            {/* Badge de Seguridad y Normativa */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur-md">
              <Award className="h-4 w-4 text-cyan-400" />
              <span>Normativa Chilena de Salud</span>
            </div>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl [text-wrap:balance]">
              La información clínica de tus pacientes, con estándar de máxima seguridad
            </h2>

            <p className="mt-4 text-base sm:text-lg text-slate-300 [text-wrap:balance]">
              Sabemos que los datos de salud son los más sensibles. Por eso {siteConfig.name} está construida cumpliendo con la <strong>Ley 20.584 de Derechos y Deberes del Paciente</strong> y las directrices del <strong>MINSAL</strong> para fichas médicas electrónicas.
            </p>
          </div>

          {/* Grilla de Pilares de Seguridad */}
          <StaggerGroup className="relative z-10 mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" staggerDelay={0.08}>
            {securityPillars.map((pillar) => {
              const Icon = pillar.Icon;
              return (
                <StaggerItem key={pillar.title} yOffset={16}>
                  <article className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-element hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-white/10">
                    <div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 transition-transform duration-micro group-hover:scale-105">
                        <Icon className="h-6 w-6" />
                      </div>

                      <h3 className="mt-5 text-base font-bold text-white">{pillar.title}</h3>
                      <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {pillar.desc}
                      </p>
                    </div>

                    <div className="mt-5 border-t border-white/10 pt-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {pillar.badge}
                      </span>
                    </div>
                  </article>
                </StaggerItem>
              );
            })}
          </StaggerGroup>

          {/* Footer de la tarjeta con resumen de garantía */}
          <div className="relative z-10 mt-12 flex flex-wrap items-center justify-center gap-6 border-t border-white/10 pt-8 text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Ley 20.584 y Ficha Clínica
            </span>
            <span>·</span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Infraestructura Cloud con 99.9% de uptime
            </span>
            <span>·</span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Aislamiento de base de datos multi-tenant
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
