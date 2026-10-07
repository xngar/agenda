"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorNotice, buttonClasses } from "@/components/ui";

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

/**
 * Listado de clínicas del panel de plataforma: estado de cada una y borrado
 * definitivo (profesionales, servicios, horario y cuentas de acceso).
 */
export function OrganizationList({ organizations }: { organizations: OrganizationRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<OrganizationRow | null>(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (!confirmar) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !eliminando) setConfirmar(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmar, eliminando]);

  async function confirmarEliminacion() {
    if (!confirmar) return;

    setEliminando(true);
    setError(null);
    try {
      const response = await fetch("/api/platform/organizations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: confirmar.slug }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "No se pudo eliminar la organización");
        return;
      }

      setConfirmar(null);
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      {error && !confirmar ? <ErrorNotice message={error} /> : null}

      {organizations.length === 0 ? (
        <p className="text-sm text-neutral-600">Todavía no hay organizaciones.</p>
      ) : (
        <ul className="space-y-3">
          {organizations.map((org) => (
            <Card
              as="li"
              key={org.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-neutral-800">{org.name}</span>
                <span className="block text-sm text-neutral-500">/{org.slug}</span>
              </span>

              <span className="flex items-center gap-3">
                <span
                  className={
                    org.active
                      ? "rounded-full bg-brand-sky-100 px-2.5 py-0.5 text-xs font-semibold text-brand-navy"
                      : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600"
                  }
                >
                  {org.active ? "Activa" : "Inactiva"}
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmar(org)}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                >
                  Eliminar
                </button>
              </span>
            </Card>
          ))}
        </ul>
      )}

      <p className="text-sm text-neutral-500">
        Eliminar una clínica no borra su historial de citas: si ya tiene citas, desactívala en su
        lugar para que deje de publicarse en el catálogo.
      </p>

      {confirmar ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-eliminar-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-neutral-900/50"
            onClick={() => {
              if (!eliminando) setConfirmar(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
            <h2 id="dialog-eliminar-titulo" className="text-lg font-bold text-brand-navy">
              ¿Eliminar {confirmar.name}?
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Se borrarán sus profesionales, servicios, horario y cuentas de acceso, junto con la
              organización. Esta acción no se puede deshacer.
            </p>

            {error ? <div className="mt-4"><ErrorNotice message={error} /></div> : null}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                disabled={eliminando}
                onClick={() => setConfirmar(null)}
              >
                Cancelar
              </Button>
              <button
                type="button"
                onClick={confirmarEliminacion}
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