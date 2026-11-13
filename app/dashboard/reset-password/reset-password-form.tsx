"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { buttonClasses, Field } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function ResetPasswordForm() {
  const router = useRouter();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setPending(true);

    try {
      // Intentar actualizar vía cliente de navegador primero (si hay sesión PKCE/hash de Supabase activa)
      const browserClient = supabaseBrowser();
      if (browserClient) {
        const { error: browserError } = await browserClient.auth.updateUser({
          password,
        });

        if (!browserError) {
          setSuccess(true);
          setPending(false);
          return;
        }
      }

      // Fallback a endpoint de servidor si la cookie httpOnly está presente
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(
          data.error ??
            "No se pudo restablecer la contraseña. El enlace puede haber caducado.",
        );
        setPending(false);
        return;
      }

      setSuccess(true);
      setPending(false);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-neutral-900">
            Contraseña actualizada
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Tu nueva contraseña institucional ha sido guardada exitosamente. Ya puedes acceder al
            panel.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            router.push("/dashboard");
            router.refresh();
          }}
          className={buttonClasses("primary", "lg", "w-full")}
        >
          Ir al panel
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Field label="Nueva contraseña" htmlFor={passwordId} hint="Mínimo 8 caracteres">
          <PasswordInput
            id={passwordId}
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={setPassword}
          />
        </Field>
      </div>

      <div className="space-y-1.5">
        <Field label="Confirmar contraseña" htmlFor={confirmPasswordId}>
          <PasswordInput
            id={confirmPasswordId}
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
        </Field>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-danger-700/20 bg-red-50 p-3 text-xs sm:text-sm font-medium text-danger-700"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || !password || !confirmPassword}
        className={buttonClasses("primary", "lg", "w-full")}
      >
        {pending ? "Guardando cambios…" : "Restablecer contraseña"}
      </button>

      <button
        type="button"
        onClick={() => router.push("/dashboard/login")}
        className="inline-flex w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Volver a inicio de sesión
      </button>
    </form>
  );
}

