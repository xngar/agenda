"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { buttonClasses, inputClasses } from "@/components/ui";
import { AsyncButton } from "@/components/motion/async-button";

export function PerfilForm({
  initialName,
  initialSpecialty,
  role,
  onDirtyChange,
}: {
  initialName: string;
  initialSpecialty: string | null;
  role: "professional" | "reception";
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialName);
  const [specialty, setSpecialty] = useState(initialSpecialty ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dirty = fullName !== initialName || specialty !== (initialSpecialty ?? "");
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

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
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-neutral-600">
        Este nombre es el que ve el equipo en el panel y los pacientes al reservar.
      </p>
      {error ? (
        <p role="alert" className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700">
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
      <AsyncButton
        type="submit"
        loading={busy}
        pendingLabel="Guardando perfil"
        className={buttonClasses("primary", "lg")}
      >
        Guardar cambios
      </AsyncButton>
    </form>
  );
}