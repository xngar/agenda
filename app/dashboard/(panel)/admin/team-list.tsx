"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui";

export interface TeamMember {
  id: string;
  full_name: string;
  specialty: string | null;
  role: "professional" | "reception";
  is_admin: boolean;
  active: boolean;
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
  const [error, setError] = useState<string | null>(null);

  async function cambiar(doctorId: string, active: boolean) {
    setError(null);
    setPendiente(doctorId);

    try {
      const response = await fetch("/api/dashboard/doctors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, active }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "No se pudo actualizar la cuenta");
        return;
      }

      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setPendiente(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {initial.map((d) => {
          const esYo = d.id === selfId;
          const ocupado = pendiente === d.id;

          return (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4"
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
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      d.active
                        ? "border-red-300 text-red-700 hover:bg-red-50"
                        : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                    }`}
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