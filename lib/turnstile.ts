import "server-only";

import { serverEnv } from "@/lib/env";

/**
 * Cloudflare Turnstile.
 *
 * Sin secreto configurado (desarrollo) se omite la verificación, igual
 * que el rate limiting: la app debe poder correr local sin credenciales.
 * En producción `TURNSTILE_SECRET_KEY` es obligatoria en `.env.example`.
 */

export const TURNSTILE_ENABLED = Boolean(process.env.TURNSTILE_SECRET_KEY);

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
}

export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  if (!TURNSTILE_ENABLED) return true;
  if (!token) return false;

  const env = serverEnv();
  if (!env.TURNSTILE_SECRET_KEY) return false;

  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return false;

    const data = (await response.json()) as TurnstileResponse;
    return data.success === true;
  } catch {
    // Fallo de red con Turnstile: preferimos bloquear sólo si la clave
    // está configurada y el servicio responde mal.
    console.warn("[turnstile] verificación falló");
    return false;
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