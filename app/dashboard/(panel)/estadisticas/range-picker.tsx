"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

type Rango = "semana" | "mes" | "trimestre";

const opciones: { value: Rango; label: string }[] = [
  { value: "semana", label: "7 días" },
  { value: "mes", label: "30 días" },
  { value: "trimestre", label: "90 días" },
];

/**
 * Chips de periodo rápido sobre la URL (`?range=`). Al presionar uno se
 * conserva el resto de los parámetros (por ejemplo `doctor`).
 */
export function RangePicker({ range }: { range: string | null }) {
  const pathname = usePathname();

  function hrefFor(value: Rango): string {
    if (pathname !== "/dashboard/estadisticas") return `/dashboard/estadisticas?range=${value}`;
    return `?range=${value}`;
  }

  return (
    <div
      role="group"
      aria-label="Periodo a analizar"
      className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
    >
      {opciones.map((opcion) => {
        const active = range === opcion.value || (range === null && opcion.value === "mes");
        return (
          <Link
            key={opcion.value}
            href={hrefFor(opcion.value)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-sm font-medium transition-colors duration-micro ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy",
              active
                ? "bg-brand-navy text-white shadow-[0_1px_2px_rgba(11,60,122,0.3)]"
                : "text-neutral-700 hover:bg-neutral-100 hover:text-brand-navy",
            )}
          >
            {opcion.label}
          </Link>
        );
      })}
    </div>
  );
}
