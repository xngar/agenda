"use client";

import Link from "next/link";

export type VistaAgenda = "dia" | "semana" | "mes";

/**
 * Conmutador Día | Semana | Mes de la agenda.
 *
 * Va en la URL como todo el panel (`?date=` / `?view=semana&date=<lunes>` /
 * `?view=mes&month=`): así se puede compartir el enlace, refrescar y volver
 * atrás sin perder el filtro de profesional.
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
    { etiqueta: "Día", href: `/dashboard?date=${dayKey}${sufijo}`, activo: vista === "dia" },
    {
      etiqueta: "Semana",
      href: `/dashboard?view=semana&date=${weekFrom}${sufijo}`,
      activo: vista === "semana",
    },
    {
      etiqueta: "Mes",
      href: `/dashboard?view=mes&month=${mesKey}${sufijo}`,
      activo: vista === "mes",
    },
  ];

  return (
    <div
      role="group"
      aria-label="Vista de la agenda"
      className="inline-flex rounded-xl border border-neutral-200 bg-neutral-100 p-1"
    >
      {opciones.map((op) => (
        <Link
          key={op.etiqueta}
          href={op.href}
          aria-current={op.activo ? "page" : undefined}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
            op.activo
              ? "bg-brand-navy text-white shadow-card"
              : "text-neutral-600 hover:text-brand-navy"
          }`}
        >
          {op.etiqueta}
        </Link>
      ))}
    </div>
  );
}