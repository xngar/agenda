"use client";

import Link from "next/link";

import { motion } from "motion/react";

export type VistaAgenda = "dia" | "semana" | "mes";

/**
 * Conmutador Día | Semana | Mes de la agenda con animación elástica compartida.
 */
export function ViewToggle({
  vista,
  dayKey,
  weekFrom,
  mesKey,
  doctor,
}: {
  vista: VistaAgenda;
  dayKey: string;
  weekFrom: string;
  mesKey: string;
  doctor: string | null;
}) {
  const sufijo = doctor ? `&doctor=${doctor}` : "";
  const opciones = [
    { id: "dia", etiqueta: "Día", href: `/dashboard?date=${dayKey}${sufijo}`, activo: vista === "dia" },
    {
      id: "semana",
      etiqueta: "Semana",
      href: `/dashboard?view=semana&date=${weekFrom}${sufijo}`,
      activo: vista === "semana",
    },
    {
      id: "mes",
      etiqueta: "Mes",
      href: `/dashboard?view=mes&month=${mesKey}${sufijo}`,
      activo: vista === "mes",
    },
  ];

  return (
    <div
      role="group"
      aria-label="Vista de la agenda"
      className="relative inline-flex items-center rounded-xl border border-neutral-200/90 bg-neutral-100 p-1 shadow-inner"
    >
      {opciones.map((op) => (
        <Link
          key={op.id}
          href={op.href}
          aria-current={op.activo ? "page" : undefined}
          className={`relative z-10 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors duration-150 active:scale-95 select-none ${
            op.activo ? "text-white" : "text-neutral-600 hover:text-brand-navy"
          }`}
        >
          {op.activo && (
            <motion.div
              layoutId="view-toggle-indicator"
              className="absolute inset-0 -z-10 rounded-lg bg-brand-navy shadow-card"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          {op.etiqueta}
        </Link>
      ))}
    </div>
  );
}