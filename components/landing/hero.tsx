"use client";

import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { CheckCircle2, ArrowRight, Mail } from "lucide-react";
import { motion } from "motion/react";
import { useMotionPrefs } from "@/components/motion/use-motion-prefs";

const easeCustom = [0.16, 1, 0.3, 1] as const;

export default function Hero() {
  const { reduce } = useMotionPrefs();

  return (
    <section
      id="top"
      className="relative h-screen w-full overflow-hidden"
    >
      {/* Imagen de fondo a pantalla completa */}
      <img
        src="/hero_pac.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      {/* Overlay degradado para legibilidad del texto */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/10" />

      <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <motion.h1
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: easeCustom }}
            className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl"
          >
            Agenda, fichas clínicas y pacientes en un solo lugar.
          </motion.h1>

          <motion.p
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16, ease: easeCustom }}
            className="mt-5 max-w-2xl text-lg text-white/90"
          >
            Para clínicas y profesionales de la salud que quieren ordenar su consulta.
          </motion.p>

          <motion.ul
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.24, ease: easeCustom }}
            className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {[
              "Reservas online",
              "Ficha clínica por especialidad",
              "Recordatorios por WhatsApp",
              "Panel para tu equipo",
            ].map((item, idx) => (
              <motion.li
                key={item}
                initial={reduce ? { opacity: 1 } : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.28 + idx * 0.05,
                  ease: easeCustom,
                }}
                className="flex items-center gap-2 text-sm font-medium text-white"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />
                <span>{item}</span>
              </motion.li>
            ))}
          </motion.ul>

          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.36, ease: easeCustom }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href="#demo"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--lp-navy)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-micro hover:scale-105 hover:bg-[var(--lp-blue)] hover:shadow-md active:scale-95"
            >
              <span>Solicitar demo</span>
              <ArrowRight className="h-4 w-4 btn-icon-right" aria-hidden="true" />
            </Link>
            <Link
              href={`mailto:${siteConfig.email}`}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-action-primary px-6 py-3 text-sm font-semibold text-action-primary-foreground shadow-sm transition-all duration-micro hover:scale-105 hover:bg-action-primary-hover hover:shadow-md active:scale-95"
            >
              <Mail className="h-4 w-4 btn-icon-wiggle" aria-hidden="true" />
              <span>Hablar con el equipo</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
