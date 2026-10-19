"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, buttonClasses, inputClasses } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { formatSlugValue } from "@/lib/platform";
import { formatPhonePartial, normalizePhone } from "@/lib/phone";

type OrgType = "dental" | "medical" | "psychological";

interface FormState {
  name: string;
  slug: string;
  timezone: string;
  type: OrgType;
  address: string;
  phone: string;
  supportEmail: string;
  consentText: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  adminSpecialty: string;
  professionalLimit: number | null;
}

const CONSENTIMIENTO_ESTANDAR =
  "Autorizo a la clínica al tratamiento de mis datos personales para gestionar mis citas, enviar recordatorios y comunicaciones relacionadas con mi atención, conforme a la Ley N° 19.628 sobre protección de datos personales.";

const INITIAL: FormState = {
  name: "",
  slug: "",
  timezone: "America/Santiago",
  type: "dental",
  address: "",
  phone: formatPhonePartial(""),
  supportEmail: "",
  consentText: CONSENTIMIENTO_ESTANDAR,
  adminFullName: "",
  adminEmail: "",
  adminPassword: "",
  adminSpecialty: "",
  professionalLimit: 2,
};

export default function OrganizationForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const telefono = normalizePhone(form.phone);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      timezone: form.timezone.trim() || "America/Santiago",
      type: form.type,
      address: form.address.trim() || undefined,
      phone: telefono || undefined,
      supportEmail: form.supportEmail.trim() || undefined,
      consentText: form.consentText.trim() || undefined,
      adminFullName: form.adminFullName.trim(),
      adminEmail: form.adminEmail.trim(),
      adminPassword: form.adminPassword,
      adminSpecialty: form.adminSpecialty.trim() || undefined,
      professionalLimit: form.professionalLimit,
    };

    try {
      const res = await fetch("/api/platform/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo crear la clínica");
        setBusy(false);
        return;
      }
      router.push("/dashboard/plataforma/organizaciones");
      router.refresh();
    } catch {
      setError("Error de red al crear la clínica");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error ? (
        <p role="alert" className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
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
              placeholder="Clínica Dental Ejemplo"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-800">Identificador (URL)</span>
            <input
              required
              value={form.slug}
              onChange={(e) => update("slug", formatSlugValue(e.target.value))}
              className={inputClasses}
              placeholder="clinica-ejemplo"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Sólo minúsculas, números y guiones"
            />
            <span className="text-xs text-neutral-500">Página pública: /{form.slug || "clinica-ejemplo"}. Los espacios se convierten en guiones automáticamente.</span>
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
            <span className="font-medium text-neutral-800">Tipo de organización</span>
            <select
              required
              value={form.type}
              onChange={(e) => update("type", e.target.value as OrgType)}
              className={inputClasses}
            >
              <option value="dental">Odontológica</option>
              <option value="medical">Médica</option>
              <option value="psychological">Psicológica</option>
            </select>
            <span className="text-xs text-neutral-500">
              Define qué ficha clínica verán los profesionales.
            </span>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-800">Teléfono</span>
            <input
              value={form.phone}
              onChange={(e) => update("phone", formatPhonePartial(e.target.value))}
              className={inputClasses}
              placeholder="+56 2 2345 6789"
              inputMode="tel"
            />
            <span className="text-xs text-neutral-500">
              Escribe sólo el número: el +56 ya está puesto.
            </span>
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
            />
            <span className="text-xs text-neutral-500">
              Texto estándar ya incluido; puedes ampliarlo o ajustarlo antes de crear la clínica.
            </span>
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
              <option value="null">Sin límite</option>
            </select>
            <span className="text-xs text-neutral-500">
              Profesionales activos permitidos. La recepción no consume cupo.
            </span>
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader title="Administrador inicial de la clínica" />
        <p className="px-5 pt-3 text-sm text-neutral-600">
          Se crea el primer usuario con permisos de administrador. Podrá entrar en{" "}
          <span className="font-medium text-neutral-800">/dashboard</span> con este correo y contraseña.
        </p>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-800">Nombre completo</span>
            <input
              required
              value={form.adminFullName}
              onChange={(e) => update("adminFullName", e.target.value)}
              className={inputClasses}
              placeholder="Dra. Camila Rojas"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-800">Especialidad (opcional)</span>
            <input
              value={form.adminSpecialty}
              onChange={(e) => update("adminSpecialty", e.target.value)}
              className={inputClasses}
              placeholder={
                form.type === "medical"
                  ? "Medicina general"
                  : form.type === "psychological"
                    ? "Psicología clínica"
                    : "Odontología general"
              }
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-800">Correo</span>
            <input
              required
              type="email"
              value={form.adminEmail}
              onChange={(e) => update("adminEmail", e.target.value)}
              className={inputClasses}
              placeholder="admin@clinica.test"
            />
          </label>

          <div className="flex flex-col gap-1.5 text-sm">
            <label htmlFor="admin-password" className="font-medium text-neutral-800">
              Contraseña temporal
            </label>
            <PasswordInput
              id="admin-password"
              required
              minLength={8}
              value={form.adminPassword}
              placeholder="Mínimo 8 caracteres"
              onChange={(v) => update("adminPassword", v)}
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className={buttonClasses("primary", "lg")}>
          {busy ? "Creando…" : "Crear clínica"}
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