"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, buttonClasses, inputClasses } from "@/components/ui";

interface FormState {
  name: string;
  slug: string;
  timezone: string;
  address: string;
  phone: string;
  supportEmail: string;
  consentText: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  adminSpecialty: string;
}

const INITIAL: FormState = {
  name: "",
  slug: "",
  timezone: "America/Santiago",
  address: "",
  phone: "",
  supportEmail: "",
  consentText: "",
  adminFullName: "",
  adminEmail: "",
  adminPassword: "",
  adminSpecialty: "",
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

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      timezone: form.timezone.trim() || "America/Santiago",
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      supportEmail: form.supportEmail.trim() || undefined,
      consentText: form.consentText.trim() || undefined,
      adminFullName: form.adminFullName.trim(),
      adminEmail: form.adminEmail.trim(),
      adminPassword: form.adminPassword,
      adminSpecialty: form.adminSpecialty.trim() || undefined,
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
              placeholder="Clínica Dental Ejemplo"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-800">Identificador (URL)</span>
            <input
              required
              value={form.slug}
              onChange={(e) => update("slug", e.target.value)}
              className={inputClasses}
              placeholder="clinica-ejemplo"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Sólo minúsculas, números y guiones"
            />
            <span className="text-xs text-neutral-500">Página pública: /{form.slug || "clinica-ejemplo"}</span>
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
              placeholder="Acepto el tratamiento de mis datos para gestionar mi cita."
            />
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
              placeholder="Odontología general"
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

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-800">Contraseña temporal</span>
            <input
              required
              type="password"
              minLength={8}
              value={form.adminPassword}
              onChange={(e) => update("adminPassword", e.target.value)}
              className={inputClasses}
              placeholder="Mínimo 8 caracteres"
            />
          </label>
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