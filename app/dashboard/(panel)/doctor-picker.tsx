"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { PublicDoctor } from "@/lib/types";

/**
 * Filtro por profesional, sólo para admins.
 *
 * Va por la URL (`?doctor=`) y no con estado local: así la agenda se
 * puede recargar, compartir y refrescar desde Realtime sin perder el
 * filtro.
 */
export function DoctorPicker({
  current,
  isAdmin,
  doctors,
}: {
  current: string | null;
  isAdmin: boolean;
  doctors?: PublicDoctor[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function irA(doctorId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (doctorId === "all") params.delete("doctor");
    else params.set("doctor", doctorId);

    startTransition(() => {
      router.push(`/dashboard${params.size ? `?${params}` : ""}`);
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
        value={current ?? "all"}
        disabled={pending || !isAdmin}
        onChange={(e) => irA(e.target.value)}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
      >
        <option value="all">Todo el equipo</option>
        {opciones.map((d) => (
          <option key={d.id} value={d.id}>
            {d.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}