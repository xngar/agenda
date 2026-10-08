"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui";
import { ServiceForm, type ServiceItem } from "./service-form";

const ghostBtn =
  "inline-flex min-h-9 items-center rounded-xl border border-neutral-300 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100";

export function ServiceList({ initial }: { initial: ServiceItem[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<ServiceItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<string | null>(null);

  async function toggle(id: string, active: boolean) {
    setError(null);
    setPendiente(id);
    try {
      const response = await fetch("/api/dashboard/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: id, active }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo actualizar el servicio");
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
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {editando ? (
        <ServiceForm
          edit={editando}
          onCancel={() => {
            setEditando(null);
            router.refresh();
          }}
        />
      ) : null}

      <ul className="space-y-2">
        {initial.map((s) => {
          const ocupado = pendiente === s.id;
          return (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900">{s.name}</p>
                <p className="text-sm text-neutral-600">{s.duration_min} minutos</p>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={s.active ? "confirmed" : "cancelled"} />
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => toggle(s.id, !s.active)}
                  disabled={ocupado}
                >
                  {ocupado ? "Actualizando..." : s.active ? "Desactivar" : "Activar"}
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => setEditando(s)}
                  disabled={ocupado}
                >
                  Editar
                </button>
              </div>
            </li>
          );
        })}
        {initial.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600">
            Aún no hay servicios. Agrega uno para que aparezca en el asistente de reserva.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
