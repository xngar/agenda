"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, buttonClasses } from "@/components/ui";
import { AsyncButton } from "@/components/motion/async-button";
import { PasswordInput } from "@/components/password-input";

export function RotarPasswordForm() {
  const router = useRouter();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (nueva !== confirmacion) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/platform/rotar-password", {
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
      <Card>
        <CardHeader title="Contraseña actualizada" />
        <div className="space-y-4 px-5 py-5">
          <p className="text-sm text-neutral-700">
            Tu contraseña cambió y tus sesiones se revocaron. Vuelve a entrar con la nueva
            contraseña.
          </p>
          <button type="button" onClick={salir} className={buttonClasses("primary", "lg")}>
            Ir al login
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Cambiar mi contraseña"
        description="Te pedimos la actual para confirmar que eres tú. Queda registro de cada cambio."
      />
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
        {error ? (
          <p role="alert" className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="actual" className="font-medium text-neutral-800">
            Contraseña actual
          </label>
          <PasswordInput id="actual" autoComplete="current-password" required value={actual} onChange={setActual} />
        </div>
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="nueva" className="font-medium text-neutral-800">
            Nueva contraseña
          </label>
          <PasswordInput
            id="nueva"
            autoComplete="new-password"
            required
            minLength={8}
            value={nueva}
            placeholder="Mínimo 8 caracteres"
            onChange={setNueva}
          />
        </div>
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="confirmacion" className="font-medium text-neutral-800">
            Confirmar nueva contraseña
          </label>
          <PasswordInput
            id="confirmacion"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmacion}
            onChange={setConfirmacion}
          />
        </div>
        <AsyncButton
          type="submit"
          loading={busy}
          pendingLabel="Cambiando contraseña"
          className={buttonClasses("primary", "lg")}
        >
          Cambiar contraseña
        </AsyncButton>
      </form>
    </Card>
  );
}
