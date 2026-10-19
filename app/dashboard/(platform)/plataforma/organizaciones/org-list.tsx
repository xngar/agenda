"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, KeyRound, Pencil, Settings, Trash2 } from "lucide-react";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button as ShadcnButton } from "@/components/ui/button";
import { Button, Card, ErrorNotice, InfoNotice, buttonClasses, inputClasses } from "@/components/ui";

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  type: "dental" | "medical" | "psychological";
  active: boolean;
  createdAt: string;
  admin: { id: string; name: string; email: string } | null;
  professionals: number;
  professionalLimit: number | null;
}

const TIPO_LABEL: Record<OrganizationRow["type"], string> = {
  dental: "Odontológica",
  medical: "Médica",
  psychological: "Psicológica",
};

const CUPOS = ["2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","30","40","50","60","70"];

/**
 * Cupo de profesionales con combobox shadcn (botón + popover con buscador).
 * Mantiene `data-professional-limit` en el trigger para el panel-check.
 */
function CupoCombobox({
  orgId,
  professionalLimit,
  disabled,
  onSelect,
}: {
  orgId: string;
  professionalLimit: number | null;
  disabled: boolean;
  onSelect: (orgId: string, value: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const actual = professionalLimit === null ? "null" : String(professionalLimit);
  const opciones = [
    ...CUPOS,
    ...(professionalLimit !== null && !CUPOS.includes(String(professionalLimit))
      ? [String(professionalLimit)]
      : []),
    "null",
  ];
  const etiqueta = (v: string) => (v === "null" ? "Sin límite" : v);

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <ShadcnButton
          data-professional-limit
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          aria-label={`Cupo de profesionales, actual: ${etiqueta(actual)}`}
          disabled={disabled}
          className="h-8 justify-between bg-white px-2.5 text-xs font-normal text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          {etiqueta(actual)}
          <ChevronsUpDown className="opacity-50" />
        </ShadcnButton>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cupo…" />
          <CommandList>
            <CommandEmpty>Sin coincidencias.</CommandEmpty>
            <CommandGroup>
              {opciones.map((v) => (
                <CommandItem
                  key={v}
                  value={v === "null" ? "Sin límite null" : `${v} ${v}`}
                  keywords={[etiqueta(v)]}
                  onSelect={() => {
                    setAbierto(false);
                    onSelect(orgId, v);
                  }}
                >
                  <Check className={cn(v === actual ? "opacity-100" : "opacity-0")} />
                  {etiqueta(v)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Acciones de una organización agrupadas en un menú (editar, restablecer
 * contraseña y borrar). Se usa en la tabla y en las tarjetas móviles.
 */
function OrgActionsMenu({
  org,
  onResetPassword,
  onDelete,
}: {
  org: OrganizationRow;
  onResetPassword: (org: OrganizationRow) => void;
  onDelete: (org: OrganizationRow) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Acciones para ${org.name}`}
          aria-haspopup="menu"
          className="inline-flex rounded-lg border border-neutral-300 p-1.5 text-neutral-700 hover:bg-neutral-100"
        >
          <Settings className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/plataforma/organizaciones/${org.id}`}>
            <Pencil />
            Editar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!org.admin}
          title={org.admin ? "Restablecer contraseña" : "Sin administrador"}
          onSelect={() => onResetPassword(org)}
        >
          <KeyRound />
          Contraseña
        </DropdownMenuItem>
        {org.slug === "plataforma" ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(org)}>
              <Trash2 />
              Eliminar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
  const [busqueda, setBusqueda] = useState("");

  const normalizar = (v: string) =>
    v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const q = normalizar(busqueda.trim());
  const visibles = q
    ? organizations.filter(
        (org) => normalizar(org.name).includes(q) || normalizar(org.slug).includes(q),
      )
    : organizations;

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

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label htmlFor="org-busqueda" className="sr-only">
            Buscar clínica por nombre
          </label>
          <input
            id="org-busqueda"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar clínica por nombre…"
            autoComplete="off"
            className={`${inputClasses} w-full sm:w-64`}
          />
        </div>
        {q ? (
          <p className="text-sm tabular-nums text-neutral-600" aria-live="polite">
            {visibles.length} de {organizations.length}
          </p>
        ) : null}
      </div>

      {visibles.length === 0 ? (
        <Card className="px-4 py-8">
          <p className="text-sm text-neutral-600">
            {organizations.length === 0
              ? "Todavía no hay organizaciones."
              : `Ninguna clínica coincide con “${busqueda.trim()}”.`}
          </p>
        </Card>
      ) : (
        <div className="hidden overflow-x-auto rounded-card border border-neutral-200 bg-white shadow-card md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Clínica</th>
                <th scope="col" className="px-4 py-3 font-semibold">Tipo</th>
                <th scope="col" className="px-4 py-3 font-semibold">Administrador</th>
                <th scope="col" className="px-4 py-3 font-semibold">Profesionales</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-4 py-3 font-semibold">Creada</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {visibles.map((org) => (
                <tr key={org.id} data-org-id={org.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-neutral-800">{org.name}</span>
                    <span className="block text-xs text-neutral-500">/{org.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
                      {TIPO_LABEL[org.type] ?? org.type}
                    </span>
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
                      <CupoCombobox
                        orgId={org.id}
                        professionalLimit={org.professionalLimit}
                        disabled={actualizando === org.id}
                        onSelect={cambiarCupo}
                      />
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
                    <div className="flex items-center justify-end">
                      <OrgActionsMenu
                        org={org}
                        onResetPassword={(o) => {
                          setError(null);
                          setResetOk(null);
                          setResetear(o);
                        }}
                        onDelete={(o) => setConfirmar(o)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visibles.length > 0 ? (
        <ul className="space-y-2 md:hidden">
          {visibles.map((org) => (
            <li
              key={org.id}
              data-org-id={org.id}
              className="rounded-card border border-neutral-200 bg-white p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-800">{org.name}</p>
                  <p className="truncate text-xs text-neutral-500">/{org.slug}</p>
                </div>
                <span
                  className={
                    org.active
                      ? "shrink-0 rounded-full bg-brand-sky-100 px-2.5 py-0.5 text-xs font-semibold text-brand-navy"
                      : "shrink-0 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600"
                  }
                >
                  {org.active ? "Activa" : "Inactiva"}
                </span>
              </div>

              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-neutral-500">Tipo</dt>
                  <dd className="text-neutral-800">{TIPO_LABEL[org.type] ?? org.type}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-neutral-500">Administrador</dt>
                  <dd className="min-w-0 text-neutral-800">
                    {org.admin ? (
                      <>
                        {org.admin.name}
                        <span className="block truncate text-xs text-neutral-500">
                          {org.admin.email}
                        </span>
                      </>
                    ) : (
                      <span className="text-neutral-400">Sin administrador</span>
                    )}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-neutral-500">Profesionales</dt>
                  <dd className="text-neutral-700">
                    {org.professionals}
                    {org.professionalLimit !== null ? ` de ${org.professionalLimit}` : " de ∞"}
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="w-24 shrink-0 text-neutral-500">Cupo</dt>
                  <dd>
                    <CupoCombobox
                      orgId={org.id}
                      professionalLimit={org.professionalLimit}
                      disabled={actualizando === org.id}
                      onSelect={cambiarCupo}
                    />
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-neutral-500">Creada</dt>
                  <dd className="text-neutral-600">{org.createdAt}</dd>
                </div>
              </dl>

              <div className="mt-3 flex justify-end">
                <OrgActionsMenu
                  org={org}
                  onResetPassword={(o) => {
                    setError(null);
                    setResetOk(null);
                    setResetear(o);
                  }}
                  onDelete={(o) => setConfirmar(o)}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-sm text-neutral-500">
        Eliminar una clínica no borra su historial de citas: si ya tiene citas, desactívala desde{" "}
        <span className="font-medium text-neutral-700">Editar</span> para que deje de publicarse en
        el catálogo. La organización interna de la plataforma no se puede eliminar, pero sí
        restablecer su contraseña.
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
          <div className="relative w-full max-w-md rounded-card bg-white p-6 shadow-card">
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
          <div className="relative w-full max-w-md rounded-card bg-white p-6 shadow-card">
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