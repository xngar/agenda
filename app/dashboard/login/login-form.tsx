"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ArrowLeft, CheckCircle2, Info } from "lucide-react";
import { buttonClasses, Field, inputClasses } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";

type FormMode = "login" | "forgot" | "forgot_success";

/**
 * El login institucional valida credenciales contra `/api/auth/login`.
 * Se ejecuta en el servidor para almacenar la sesión en cookies httpOnly
 * seguras. Además, incluye soporte integrado para recuperar contraseña.
 */
export function LoginForm() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const recoveryEmailId = useId();

  const [mode, setMode] = useState<FormMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "No se pudo iniciar sesión");
        setPending(false);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("No pudimos conectarnos con el servidor. Intenta nuevamente.");
      setPending(false);
    }
  }

  async function onForgotSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "No fue posible procesar la solicitud");
        setPending(false);
        return;
      }

      setMode("forgot_success");
      setPending(false);
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
      setPending(false);
    }
  }

  if (mode === "forgot_success") {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-neutral-900">
            Revisa tu bandeja de entrada
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Si <strong className="font-medium text-neutral-900">{recoveryEmail}</strong> está
            registrado en la plataforma, recibirás un enlace seguro para restablecer tu contraseña.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-neutral-50 p-3 text-left text-xs text-neutral-600">
          <p className="leading-relaxed">
            Por favor verifica también tu carpeta de spam o correo no deseado. El enlace es válido
            por tiempo limitado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={buttonClasses("ghost", "md", "w-full")}
        >
          Volver a inicio de sesión
        </button>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <form onSubmit={onForgotSubmit} className="space-y-4" noValidate>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-neutral-900">
            Recuperar contraseña
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Ingresa tu correo electrónico registrado. Te enviaremos un enlace seguro para que
            puedas definir una nueva contraseña.
          </p>
        </div>

        <Field label="Correo institucional" htmlFor={recoveryEmailId}>
          <input
            id={recoveryEmailId}
            type="email"
            name="recoveryEmail"
            autoComplete="email"
            placeholder="profesional@clinica.cl"
            required
            className={inputClasses}
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
          />
        </Field>

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
          disabled={pending || !recoveryEmail.trim()}
          className={buttonClasses("primary", "lg", "w-full")}
        >
          {pending ? "Enviando enlace…" : "Enviar enlace de recuperación"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className="inline-flex w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Volver a iniciar sesión
        </button>

        <div className="mt-4 rounded-xl border border-neutral-200/80 bg-neutral-50 p-3 text-xs text-neutral-600 flex items-start gap-2">
          <Info className="h-4 w-4 text-action-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            Si no tienes acceso a tu correo o eres un profesional nuevo, el administrador de tu
            clínica puede restablecer tu contraseña directamente desde su panel.
          </p>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onLoginSubmit} className="space-y-4" noValidate>
      <Field label="Correo institucional" htmlFor={emailId}>
        <input
          id={emailId}
          type="email"
          name="email"
          autoComplete="username"
          placeholder="nombre@clinica.cl"
          required
          className={inputClasses}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor={passwordId} className="block text-sm font-medium text-neutral-800">
            Contraseña
            <span className="ml-1 text-action-primary" aria-hidden="true">
              *
            </span>
          </label>
          <button
            type="button"
            onClick={() => {
              setRecoveryEmail(email);
              setError(null);
              setMode("forgot");
            }}
            className="text-xs font-semibold text-action-primary hover:text-action-primary-hover hover:underline transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <PasswordInput
          id={passwordId}
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={setPassword}
        />
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
        disabled={pending}
        className={buttonClasses("primary", "lg", "w-full")}
      >
        {pending ? "Iniciando sesión…" : "Ingresar al panel"}
      </button>
    </form>
  );
}
