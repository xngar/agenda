"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Calendar, Columns3, Grid3X3 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type VistaAgenda = "dia" | "semana" | "mes";

/**
 * Conmutador Día | Semana | Mes de la agenda con animación elástica compartida
 * e iconos semánticos para máxima claridad de visualización.
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
    {
      id: "dia",
      etiqueta: "Día",
      descripcion: "Vista detallada de citas del día",
      icono: Calendar,
      href: `/dashboard?date=${dayKey}${sufijo}`,
      activo: vista === "dia",
    },
    {
      id: "semana",
      etiqueta: "Semana",
      descripcion: "Vista de lunes a domingo en columnas",
      icono: Columns3,
      href: `/dashboard?view=semana&date=${weekFrom}${sufijo}`,
      activo: vista === "semana",
    },
    {
      id: "mes",
      etiqueta: "Mes",
      descripcion: "Calendario mensual en cuadrícula",
      icono: Grid3X3,
      href: `/dashboard?view=mes&month=${mesKey}${sufijo}`,
      activo: vista === "mes",
    },
  ];

  return (
    <div
      role="group"
      aria-label="Modo de vista de la agenda"
      className="relative inline-flex items-center rounded-xl border border-neutral-200/90 bg-neutral-100/90 p-1 shadow-xs"
    >
      {opciones.map((op) => {
        const Icono = op.icono;
        return (
          <Tooltip key={op.id}>
            <TooltipTrigger asChild>
              <Link
                href={op.href}
                aria-current={op.activo ? "page" : undefined}
                className={`relative z-10 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold sm:px-3.5 sm:text-sm transition-colors duration-150 active:scale-95 select-none ${
                  op.activo
                    ? "text-white"
                    : "text-neutral-600 hover:text-action-primary"
                }`}
              >
                {op.activo && (
                  <motion.div
                    layoutId="view-toggle-indicator"
                    className="absolute inset-0 -z-10 rounded-lg bg-action-primary shadow-sm"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <Icono className={`h-4 w-4 shrink-0 ${op.activo ? "text-white" : "text-neutral-500"}`} aria-hidden="true" />
                <span>{op.etiqueta}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              {op.descripcion}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}