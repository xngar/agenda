"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonClasses, StatusBadge } from "@/components/ui";
import { ServiceForm, type ServiceItem } from "./service-form";

const ghostBtn =
  "inline-flex min-h-9 items-center rounded-xl border border-neutral-300 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100";

export function ServiceList({ initial }: { initial: ServiceItem[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<ServiceItem | null>(null);
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [porEliminar, setPorEliminar] = useState<ServiceItem | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function toggle(id: string, active: boolean) {
    setPendiente(id);
    try {
      const response = await fetch("/api/dashboard/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: id, active }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "No se pudo actualizar el servicio");
        return;
      }
      toast.success(active ? "Servicio activado" : "Servicio desactivado");
      router.refresh();
    } catch {
      toast.error("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setPendiente(null);
    }
  }

  async function eliminar() {
    if (!porEliminar) return;
    setEliminando(true);
    try {
      const response = await fetch("/api/dashboard/services", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: porEliminar.id }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "No se pudo eliminar el servicio");
        return;
      }
      toast.success(`Servicio "${porEliminar.name}" eliminado`);
      setPorEliminar(null);
      router.refresh();
    } catch {
      toast.error("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="space-y-3">
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

              <div className="flex flex-wrap items-center justify-end gap-2">
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
                <button
                  type="button"
                  className="inline-flex min-h-9 items-center rounded-xl border border-red-300 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => setPorEliminar(s)}
                  disabled={ocupado}
                >
                  Eliminar
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

      {porEliminar ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-eliminar-servicio-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-neutral-900/50"
            onClick={() => {
              if (!eliminando) setPorEliminar(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
            <h2 id="dialog-eliminar-servicio-titulo" className="text-lg font-bold text-brand-navy">
              ¿Eliminar {porEliminar.name}?
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Solo se pueden eliminar servicios sin citas asociadas. Si ya tiene citas
              agendadas, desactívalo en vez de eliminarlo. Esta acción no se puede deshacer.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" size="sm" disabled={eliminando} onClick={() => setPorEliminar(null)}>
                Cancelar
              </Button>
              <button
                type="button"
                onClick={eliminar}
                disabled={eliminando}
                className={buttonClasses("danger", "sm")}
              >
                {eliminando ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
