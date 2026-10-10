"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, buttonClasses, inputClasses } from "@/components/ui";

interface FormState {
  name: string;
  slug: string;
  timezone: string;
  phone: string;
  address: string;
  supportEmail: string;
  consentText: string;
  active: boolean;
  professionalLimit: number | null;
}

export function OrganizationEditForm({
  id,
  initial,
  slugReserved = false,
}: {
  id: string;
  initial: FormState;
  slugReserved?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const payload = {
      id,
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      timezone: form.timezone.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      supportEmail: form.supportEmail.trim() || null,
      consentText: form.consentText.trim() || null,
      active: form.active,
      professionalLimit: form.professionalLimit,
    };

    try {
      const res = await fetch("/api/platform/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo actualizar la organización");
        setBusy(false);
        return;
      }
      router.push("/dashboard/plataforma/organizaciones");
      router.refresh();
    } catch {
      setError("Error de red al actualizar la organización");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader title="Datos de la clínica" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-800">Nombre</span>
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputClasses}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-800">Identificador (URL)</span>
            <input
              value={form.slug}
              onChange={(e) => update("slug", e.target.value)}
              disabled={slugReserved}
              className={`${inputClasses} disabled:cursor-not-allowed ${slugReserved ? "disabled:bg-neutral-100 disabled:text-neutral-500" : ""}`}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Sólo minúsculas, números y guiones"
            />
            {slugReserved ? (
              <span className="text-xs font-medium text-neutral-500">
                Identificador reservado por la plataforma, no se puede cambiar.
              </span>
            ) : (
              <span className="text-xs text-neutral-500">
                Página pública: /{form.slug || "…"}. Si cambia, la dirección anterior dejará de
                funcionar.
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-800">Zona horaria</span>
            <input
              required
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              className={inputClasses}
              placeholder="America/Santiago"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-800">Teléfono</span>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputClasses}
              placeholder="+56 2 2345 6789"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-neutral-800">Dirección</span>
            <input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className={inputClasses}
              placeholder="Av. Providencia 1234, Of. 502, Santiago"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-neutral-800">Correo de soporte</span>
            <input
              type="email"
              value={form.supportEmail}
              onChange={(e) => update("supportEmail", e.target.value)}
              className={inputClasses}
              placeholder="reservas@clinica.test"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-neutral-800">Texto de consentimiento</span>
            <textarea
              value={form.consentText}
              onChange={(e) => update("consentText", e.target.value)}
              className={`${inputClasses} min-h-20`}
              placeholder="Autorizo a la clínica a guardar mis datos para gestionar mi cita."
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-neutral-800">Cupo de profesionales</span>
            <select
              value={form.professionalLimit === null ? "null" : String(form.professionalLimit)}
              onChange={(e) =>
                update("professionalLimit", e.target.value === "null" ? null : parseInt(e.target.value, 10))
              }
              className={inputClasses}
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 40, 50, 60, 70].map(
                (n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ),
              )}
              {form.professionalLimit !== null &&
              ![2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 40, 50, 60, 70].includes(
                form.professionalLimit,
              ) ? (
                <option value={String(form.professionalLimit)}>{form.professionalLimit}</option>
              ) : null}
              <option value="null">Sin límite</option>
            </select>
            <span className="text-xs text-neutral-500">
              Profesionales activos permitidos en esta clínica. La recepción no consume cupo.
            </span>
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-neutral-800">Estado de la organización</p>
            <p className="mt-1 text-sm text-neutral-600">
              Inactiva: deja de aparecer en el catálogo público y no recibe reservas nuevas.
              Conserva todo su historial.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-neutral-800">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => update("active", e.target.checked)}
              className="h-5 w-5 rounded border-neutral-300 accent-[var(--color-brand-navy,#14273e)]"
            />
            Activa
          </label>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className={buttonClasses("primary", "lg")}>
          {busy ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => router.push("/dashboard/plataforma/organizaciones")}
          className={buttonClasses("ghost", "lg")}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}