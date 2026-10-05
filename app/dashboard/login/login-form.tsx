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
        <input
          id={passwordId}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className={inputClasses}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
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