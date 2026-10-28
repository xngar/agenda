import "server-only";

import { serverEnv } from "@/lib/env";

/**
 * Cloudflare Turnstile.
 *
 * Sin secreto se omite sólo en desarrollo. En producción, una configuración
 * ausente o una caída del proveedor bloquea reservas.
 */
export const TURNSTILE_ENABLED = Boolean(process.env.TURNSTILE_SECRET_KEY);

let avisado = false;

function avisarSiFaltaEnProduccion() {
  if (TURNSTILE_ENABLED || avisado) return;
  avisado = true;
  if (process.env.NODE_ENV !== "production") return;
  console.error(
    "[turnstile] TURNSTILE_SECRET_KEY no está definida: las reservas se bloquearán hasta configurar la verificación anti-bot.",
  );
}

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
}

export async function verifyTurnstile(
  token: string | undefined,
  ip?: string,
): Promise<"verified" | "invalid" | "unavailable"> {
  if (!TURNSTILE_ENABLED) {
    avisarSiFaltaEnProduccion();
    return process.env.NODE_ENV !== "production" ? "verified" : "unavailable";
  }
  if (!token) return "invalid";

  const env = serverEnv();
  if (!env.TURNSTILE_SECRET_KEY) return "unavailable";

  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return "unavailable";

    const data = (await response.json()) as TurnstileResponse;
    if (typeof data.success !== "boolean") return "unavailable";
    if (data.success) return "verified";
    if (
      data["error-codes"]?.some((code) =>
        ["internal-error", "missing-input-secret", "invalid-input-secret"].includes(code),
      )
    ) {
      return "unavailable";
    }
    return "invalid";
  } catch {
    console.warn("[turnstile] verificación falló");
    return "unavailable";
  }
}

export function clientIp(request: Request): string | undefined {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined
  );
}