"use client";

import Link from "next/link";

/**
 * Conmutador Día | Mes de la agenda.
 *
 * Va en la URL como todo el panel (`?date=` / `?view=mes&month=`): así se
 * puede compartir el enlace, refrescar y volver atrás sin perder el
 * filtro de profesional.
 */
export function ViewToggle({
  verMes,
  dayKey,
  mesKey,
  doctor,
}: {
  verMes: boolean;
  dayKey: string;
  mesKey: string;
  doctor: string | null;
}) {
  const sufijo = doctor ? `&doctor=${doctor}` : "";
  const opciones = [
    { etiqueta: "Día", href: `/dashboard?date=${dayKey}${sufijo}`, activo: !verMes },
    { etiqueta: "Mes", href: `/dashboard?view=mes&month=${mesKey}${sufijo}`, activo: verMes },
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
