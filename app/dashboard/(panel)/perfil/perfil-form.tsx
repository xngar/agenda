"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, buttonClasses, inputClasses } from "@/components/ui";

export function PerfilForm({
  initialName,
  initialSpecialty,
  role,
}: {
  initialName: string;
  initialSpecialty: string | null;
  role: "professional" | "reception";
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialName);
  const [specialty, setSpecialty] = useState(initialSpecialty ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, specialty: specialty || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar tu perfil");
        return;
      }
      setOk("Perfil actualizado.");
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Mis datos"
        description="Este nombre es el que ve el equipo en el panel y los pacientes al reservar."
      />
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {ok}
          </p>
        ) : null}
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="perfil-nombre" className="font-medium text-neutral-800">
            Nombre completo
          </label>
          <input
            id="perfil-nombre"
            required
            minLength={3}
            maxLength={120}
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClasses}
          />
        </div>
        {role === "professional" ? (
          <div className="flex flex-col gap-1.5 text-sm">
            <label htmlFor="perfil-especialidad" className="font-medium text-neutral-800">
              Especialidad <span className="font-normal text-neutral-500">(opcional)</span>
            </label>
            <input
              id="perfil-especialidad"
              maxLength={80}
              autoComplete="off"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className={inputClasses}
            />
          </div>
        ) : null}
        <button type="submit" disabled={busy} className={buttonClasses("primary", "lg")}>
          {busy ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </Card>
  );
}
