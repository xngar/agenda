"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Field, inputClasses } from "@/components/ui";

/**
 * El login va contra `/api/auth/login`, no contra Supabase desde el
 * navegador: así la contraseña se verifica en el servidor y la sesión
 * queda en cookies httpOnly que el proxy y los Server Components pueden
 * leer.
 */
export function LoginForm() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
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

      // `refresh()` fuerza a los Server Components a releer la sesión con
      // la cookie nueva; sin esto el layout seguiría viendo al anónimo.
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Correo" htmlFor={emailId}>
        <input
          id={emailId}
          type="email"
          name="email"
          autoComplete="username"
          required
          className={inputClasses}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label="Contraseña" htmlFor={passwordId}>
        <span className="relative block">
          <input
            id={passwordId}
            type={verPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            className={`${inputClasses} pr-12`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setVerPassword((v) => !v)}
            aria-pressed={verPassword}
            aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            title={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-neutral-500 transition-colors hover:text-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
          >
            {verPassword ? <OjoCerradoIcon /> : <OjoIcon />}
          </button>
        </span>
      </Field>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-navy px-4 py-2.5 font-semibold text-white transition-colors hover:bg-brand-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Ingresar"}
      </button>
    </form>
  );
}

function OjoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function OjoCerradoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 3.9M6.6 6.6C4 8.2 2 12 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.9-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}