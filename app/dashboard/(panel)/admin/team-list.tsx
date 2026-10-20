"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "cn";
import { buttonClasses, StatusBadge } from "@/components/ui";

const dangerGhost = cn(
  buttonClasses("ghost", "sm"),
  "border-danger-200 text-danger-700 hover:bg-danger-50",
);

export interface TeamMember {
  id: string;
  full_name: string;
  specialty: string | null;
  role: "professional" | "reception";
  is_admin: boolean;
  active: boolean;
  email: string | null;
}

/**
 * Gestión del equipo: activar y desactivar cuentas.
 *
 * Igual que en la agenda, tras cada cambio se hace `router.refresh()` en vez
 * de mutar la lista en el cliente: el servidor es la fuente de verdad y el
 * refresco trae además los cambios que haya hecho otro administrador.
 *
 * Un profesional desactivado deja de aparecer en el asistente público y su
 * login empieza a rechazar. Las citas que ya tiene asignadas NO se borran:
 * quedan visibles para el resto del equipo y hay que reasignarlas a mano.
 */
export function TeamList({ initial, selfId }: { initial: TeamMember[]; selfId: string }) {
  const router = useRouter();
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [tab, setTab] = useState<"activos" | "desactivados">("activos");

  const activos = initial.filter((d) => d.active);
  const desactivados = initial.filter((d) => !d.active);
  const visibles = tab === "activos" ? activos : desactivados;

  async function cambiar(doctorId: string, active: boolean) {
    setPendiente(doctorId);

    try {
      const response = await fetch("/api/dashboard/doctors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, active }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? "No se pudo actualizar la cuenta");
        return;
      }

      toast.success(active ? "Cuenta activada" : "Cuenta desactivada");
      router.refresh();
    } catch {
      toast.error("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setPendiente(null);
    }
  }

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Estado de profesionales" className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "activos"}
          onClick={() => setTab("activos")}
          className={`inline-flex min-h-9 flex-1 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors ${
            tab === "activos"
              ? "bg-white text-brand-navy shadow-sm"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Activos ({activos.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "desactivados"}
          onClick={() => setTab("desactivados")}
          className={`inline-flex min-h-9 flex-1 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors ${
            tab === "desactivados"
              ? "bg-white text-brand-navy shadow-sm"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Desactivados ({desactivados.length})
        </button>
      </div>

      <ul className="space-y-2">
        {visibles.length === 0 ? (
          <li className="rounded-card border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
            {tab === "activos"
              ? "No hay profesionales activos."
              : "No hay profesionales desactivados."}
          </li>
        ) : null}
        {visibles.map((d) => {
          const esYo = d.id === selfId;
          const ocupado = pendiente === d.id;

          return (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-neutral-200 bg-white p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900">
                  {d.full_name}
                  {esYo ? (
                    <span className="ml-2 text-xs font-normal text-neutral-500">(tú)</span>
                  ) : null}
                </p>
                <p className="text-sm text-neutral-600">
                  {d.specialty ?? "Sin especialidad"}
                </p>
                <p className="text-xs break-all text-neutral-500">
                  {d.email ?? "—"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {d.is_admin ? (
                  <span className="rounded-full bg-brand-navy-50 px-2.5 py-1 text-xs font-semibold text-brand-navy">
                    Administrador
                  </span>
                ) : null}

                {d.role === "reception" ? (
                  <span className="rounded-full bg-brand-sky-50 px-2.5 py-1 text-xs font-semibold text-brand-navy">
                    Recepción
                  </span>
                ) : null}

                <StatusBadge status={d.active ? "confirmed" : "cancelled"} />

                {/*
                  El propio usuario no se desactiva desde aquí: el login
                  exige `active` y el cambio sería irreversible sin otro
                  administrador.
                */}
                {esYo ? (
                  <span className="text-xs text-neutral-500">Tu cuenta</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => cambiar(d.id, !d.active)}
                    disabled={ocupado}
                    className={d.active ? dangerGhost : buttonClasses("ghost", "sm")}
                  >
                    {d.active ? "Desactivar" : "Activar"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-neutral-500">
        Desactivar oculta al profesional del asistente y le impide entrar al panel. No
        elimina sus citas: reasignarlas antes si dejara de atender.
      </p>

      <p className="sr-only" aria-live="polite">
        {pendiente ? "Actualizando cuenta" : ""}
      </p>
    </div>
  );
}