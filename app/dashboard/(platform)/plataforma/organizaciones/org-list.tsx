"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorNotice, InfoNotice, buttonClasses, inputClasses } from "@/components/ui";

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  admin: { id: string; name: string; email: string } | null;
  professionals: number;
  professionalLimit: number | null;
}

/**
 * Listado de clínicas del panel de plataforma, en tabla: administrador de
 * cada una, número de profesionales, estado y acciones (editar, restablecer
 * contraseña y borrado definitivo).
 */
export function OrganizationList({ organizations }: { organizations: OrganizationRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<OrganizationRow | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [actualizando, setActualizando] = useState<string | null>(null);

  const [resetear, setResetear] = useState<OrganizationRow | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [restableciendo, setRestableciendo] = useState(false);
  const [resetOk, setResetOk] = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (!confirmar && !resetear) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirmar && !eliminando) setConfirmar(null);
      if (resetear && !restableciendo) {
        setResetear(null);
        setResetOk(null);
        setNuevaPassword("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmar, resetear, eliminando, restableciendo]);

  async function cambiarCupo(id: string, value: string) {
    setActualizando(id);
    setError(null);
    const next: number | null = value === "null" ? null : parseInt(value, 10);
    try {
      const res = await fetch("/api/platform/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, professionalLimit: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo actualizar el cupo de profesionales");
      }
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setActualizando(null);
    }
  }

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

  async function confirmarReset() {
    if (!resetear?.admin) return;

    setRestableciendo(true);
    setError(null);
    try {
      const response = await fetch("/api/platform/organizations/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: resetear.admin.id, password: nuevaPassword }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "No se pudo restablecer la contraseña");
        return;
      }

      setResetOk({ name: resetear.admin.name });
      setNuevaPassword("");
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setRestableciendo(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {error ? <div className="mb-4"><ErrorNotice message={error} /></div> : null}

      {organizations.length === 0 ? (
        <Card className="px-4 py-8">
          <p className="text-sm text-neutral-600">Todavía no hay organizaciones.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-card border border-neutral-200 bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Clínica</th>
                <th scope="col" className="px-4 py-3 font-semibold">Administrador</th>
                <th scope="col" className="px-4 py-3 font-semibold">Profesionales</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-4 py-3 font-semibold">Creada</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {organizations.map((org) => (
                <tr key={org.id} data-org-id={org.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-neutral-800">{org.name}</span>
                    <span className="block text-xs text-neutral-500">/{org.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    {org.admin ? (
                      <>
                        <span className="block text-neutral-800">{org.admin.name}</span>
                        <span className="block text-xs text-neutral-500">{org.admin.email}</span>
                      </>
                    ) : (
                      <span className="text-neutral-400">Sin administrador</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {org.professionals}
                    {org.professionalLimit !== null ? ` de ${org.professionalLimit}` : " de ∞"}
                    <div className="mt-1">
                      <select
                        data-professional-limit
                        disabled={actualizando === org.id}
                        value={org.professionalLimit === null ? "null" : String(org.professionalLimit)}
                        onChange={(e) => cambiarCupo(org.id, e.target.value)}
                        className={`${inputClasses} h-8 text-xs`}
                      >
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10</option>
                        <option value="11">11</option>
                        <option value="12">12</option>
                        <option value="13">13</option>
                        <option value="14">14</option>
                        <option value="15">15</option>
                        <option value="16">16</option>
                        <option value="17">17</option>
                        <option value="18">18</option>
                        <option value="19">19</option>
                        <option value="20">20</option>
                        <option value="30">30</option>
                        <option value="40">40</option>
                        <option value="50">50</option>
                        <option value="60">60</option>
                        <option value="70">70</option>
                        <option value="null">Sin límite</option>
                        {org.professionalLimit !== null &&
                          ![
                            "2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","30","40","50","60","70",
                          ].includes(String(org.professionalLimit)) ? (
                          <option value={String(org.professionalLimit)}>
                            {org.professionalLimit}
                          </option>
                        ) : null}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        org.active
                          ? "inline-flex rounded-full bg-brand-sky-100 px-2.5 py-0.5 text-xs font-semibold text-brand-navy"
                          : "inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600"
                      }
                    >
                      {org.active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-600">{org.createdAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/plataforma/organizaciones/${org.id}`}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        disabled={!org.admin}
                        onClick={() => {
                          setError(null);
                          setResetOk(null);
                          setResetear(org);
                        }}
                        title={org.admin ? "Restablecer contraseña" : "Sin administrador"}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Contraseña
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmar(org)}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-[color:var(--color-danger,#b91c1c)]"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-neutral-500">
        Eliminar una clínica no borra su historial de citas: si ya tiene citas, desactívala desde{" "}
        <span className="font-medium text-neutral-700">Editar</span> para que deje de publicarse en
        el catálogo.
      </p>

      {/* ── Confirmación de borrado ─────────────────────────────────── */}
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

      {/* ── Restablecer contraseña ──────────────────────────────────── */}
      {resetear?.admin ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-password-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-neutral-900/50"
            onClick={() => {
              if (!restableciendo) {
                setResetear(null);
                setResetOk(null);
                setNuevaPassword("");
              }
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
            {resetOk ? (
              <>
                <h2 id="dialog-password-titulo" className="text-lg font-bold text-brand-navy">
                  Contraseña restablecida
                </h2>
                <div className="mt-3">
                  <InfoNotice>
                    La contraseña de <span className="font-semibold">{resetOk.name}</span> ya fue
                    actualizada. Compártela con la clínica para que entre al panel.
                  </InfoNotice>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      setResetear(null);
                      setResetOk(null);
                    }}
                  >
                    Listo
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 id="dialog-password-titulo" className="text-lg font-bold text-brand-navy">
                  Nueva contraseña · {resetear.name}
                </h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Se la asignarán a <span className="font-medium text-neutral-800">{resetear.admin.name}</span>{" "}
                  ({resetear.admin.email}). Luego deberás compartírsela; no se envía por correo.
                </p>

                <label className="mt-4 flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-neutral-800">Contraseña temporal</span>
                  <input
                    type="password"
                    value={nuevaPassword}
                    minLength={8}
                    autoFocus
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    className={inputClasses}
                    placeholder="Mínimo 8 caracteres"
                  />
                </label>

                {error ? <div className="mt-4"><ErrorNotice message={error} /></div> : null}

                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={restableciendo}
                    onClick={() => {
                      setResetear(null);
                      setNuevaPassword("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <button
                    type="button"
                    onClick={confirmarReset}
                    disabled={restableciendo || nuevaPassword.length < 8}
                    className={buttonClasses("primary", "sm")}
                  >
                    {restableciendo ? "Restableciendo…" : "Restablecer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}