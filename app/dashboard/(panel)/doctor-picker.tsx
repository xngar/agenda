"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { PublicDoctor } from "@/lib/types";

/**
 * Filtro por profesional, para quienes ven toda la agenda (admin y
 * recepción).
 *
 * Va por la URL (`?doctor=`) y no con estado local: así la agenda se
 * puede recargar, compartir y refrescar desde Realtime sin perder el
 * filtro.
 */
export function DoctorPicker({
  current,
  canFilter,
  doctors,
  basePath = "/dashboard",
  allOption = true,
}: {
  current: string | null;
  canFilter: boolean;
  doctors?: PublicDoctor[];
  /** Sección desde la que se navega: la agenda usa /dashboard, el horario, /dashboard/horario. */
  basePath?: string;
  /**
   * En la agenda "Todo el equipo" significa algo (ve todas las citas). En el
   * horario no: hay que editar el horario de UN profesional, así que esa
   * opción no aparece.
   */
  allOption?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function irA(doctorId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (doctorId === "all") params.delete("doctor");
    else params.set("doctor", doctorId);

    startTransition(() => {
      router.push(`${basePath}${params.size ? `?${params}` : ""}`);
    });
  }

  const opciones = doctors ?? [];

  return (
    <div>
      <label htmlFor="filtro-doctor" className="mb-1 block text-xs font-medium text-neutral-600">
        Profesional
      </label>
      <select
        id="filtro-doctor"
        value={allOption && !current ? "all" : (current ?? "")}
        disabled={pending || !canFilter}
        onChange={(e) => irA(e.target.value)}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
      >
        {allOption ? <option value="all">Todo el equipo</option> : null}
        {opciones.map((d) => (
          <option key={d.id} value={d.id}>
            {d.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}