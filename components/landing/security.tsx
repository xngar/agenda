"use client";

import { Lock, Database, Download, FileCheck } from "lucide-react";
import { StaggerGroup, StaggerItem } from "@/components/motion/scroll-reveal";

export default function Security() {
  const securityPillars = [
    {
      Icon: Lock,
      title: "Permisos por rol",
      desc: "Cada persona ve solo lo que necesita: profesional, recepción o administrador.",
    },
    {
      Icon: FileCheck,
      title: "Registro de accesos",
      desc: "Queda registrado quién consultó o modificó cada ficha.",
    },
    {
      Icon: Database,
      title: "Cifrado y respaldos",
      desc: "Tus datos viajan y se guardan cifrados, con copias de seguridad.",
    },
    {
      Icon: Download,
      title: "Tus datos son tuyos",
      desc: "Exporta fichas y contactos en PDF o CSV cuando quieras.",
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

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl [text-wrap:balance]">
              Los datos de tus pacientes, protegidos
            </h2>

            <p className="mt-5 text-base sm:text-lg text-slate-300 [text-wrap:balance]">
              Cumplimos la <strong>Ley 20.584</strong> y las directrices del <strong>MINSAL</strong> para fichas electrónicas.
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
                  </article>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </div>
      </div>
    </section>
  );
}
