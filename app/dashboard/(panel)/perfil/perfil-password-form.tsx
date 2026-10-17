"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { buttonClasses } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";

export function PerfilPasswordForm({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const router = useRouter();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const dirty = actual !== "" || nueva !== "" || confirmacion !== "";
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (nueva !== confirmacion) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual, nueva }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo actualizar la contraseña");
        setBusy(false);
        return;
      }
      setActual("");
      setNueva("");
      setConfirmacion("");
      setOk(true);
    } catch {
      setError("Error de red al actualizar la contraseña");
      setBusy(false);
    }
  }

  async function salir() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/dashboard/login");
    router.refresh();
  }

  if (ok) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">
          Tu contraseña cambió. Vuelve a entrar con la nueva contraseña.
        </p>
        <button type="button" onClick={salir} className={buttonClasses("primary", "lg")}>
          Ir al login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-neutral-600">
        Te pedimos la actual para confirmar que eres tú. Queda registro de cada cambio.
      </p>
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor="perfil-actual" className="font-medium text-neutral-800">
          Contraseña actual
        </label>
        <PasswordInput id="perfil-actual" autoComplete="current-password" required value={actual} onChange={setActual} />
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor="perfil-nueva" className="font-medium text-neutral-800">
          Nueva contraseña
        </label>
        <PasswordInput
          id="perfil-nueva"
          autoComplete="new-password"
          required
          minLength={8}
          value={nueva}
          placeholder="Mínimo 8 caracteres"
          onChange={setNueva}
        />
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor="perfil-confirmacion" className="font-medium text-neutral-800">
          Confirmar nueva contraseña
        </label>
        <PasswordInput
          id="perfil-confirmacion"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmacion}
          onChange={setConfirmacion}
        />
      </div>
      <button type="submit" disabled={busy} className={buttonClasses("primary", "lg")}>
        {busy ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}