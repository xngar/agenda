"use client";

import { useEffect, useRef } from "react";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/motion/scroll-reveal";

const steps = [
  {
    step: "01",
    title: "Desde tu enlace",
    desc: "Eligen servicio, profesional y hora sin descargar aplicaciones ni crear cuentas.",
  },
  {
    step: "02",
    title: "Sin cruces de agenda",
    desc: "Cada horario reservado se bloquea al instante. Nunca se ofrece dos veces.",
  },
  {
    step: "03",
    title: "Confirmas en un clic",
    desc: "Apruebas la cita desde tu panel y el paciente recibe su confirmación automática.",
  },
];

export default function Problem() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative bg-white py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal yOffset={16} className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl [text-wrap:balance]">
            Tus pacientes reservan solos. Tú solo confirmas.
          </h2>

          <p className="mt-5 text-base text-neutral-500 sm:text-xl [text-wrap:balance]">
            Reserva online en menos de un minuto, sin apps ni cuentas.
          </p>
        </ScrollReveal>

        <ScrollReveal yOffset={20} className="mx-auto mt-12 w-[90%] max-w-[64.8rem] sm:mt-16">
          <div className="overflow-hidden rounded-[30px] bg-neutral-950 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5">
            <video
              ref={videoRef}
              src="/brag.mp4"
              muted
              playsInline
              loop
              preload="metadata"
              aria-label="Demostración visual de la plataforma"
              className="block h-auto w-full rounded-[30px] object-cover pointer-events-none select-none"
            />
          </div>
        </ScrollReveal>

        <StaggerGroup
          className="mx-auto mt-14 grid max-w-5xl gap-8 border-t border-neutral-100 pt-10 sm:mt-16 sm:grid-cols-3 sm:gap-10"
          staggerDelay={0.08}
        >
          {steps.map(({ step, title, desc }) => (
            <StaggerItem key={step} yOffset={12}>
              <div>
                <span className="font-mono text-xs font-semibold text-neutral-400">{step}</span>
                <h3 className="mt-2 text-base font-bold text-neutral-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
