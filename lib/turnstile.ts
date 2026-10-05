import "server-only";

import { serverEnv } from "@/lib/env";

/**
 * Cloudflare Turnstile.
 *
 * Sin secreto configurado (desarrollo) se omite la verificación, igual
 * que el rate limiting: la app debe poder correr local sin credenciales.
 * En producción `TURNSTILE_SECRET_KEY` es obligatoria.
 *
 * Que sea "obligatoria" no significa que algo lo exija: si se despliega sin
 * la clave, `TURNSTILE_ENABLED` queda en falso y `verifyTurnstile` acepta
 * cualquier reserva sin mirar el token. Eso es un fallo silencioso y
 * permanentes, así que en producción se avisa una vez por proceso en vez de
 * seguir como si nada. No se corta el despliegue porque eso dejaría la
 * clínica sin agendar; que quede registrado en los logs.
 */
export const TURNSTILE_ENABLED = Boolean(process.env.TURNSTILE_SECRET_KEY);

let avisado = false;

function avisarSiFaltaEnProduccion() {
  if (TURNSTILE_ENABLED || avisado) return;
  avisado = true;
  if (process.env.NODE_ENV !== "production") return;
  console.error(
    "[turnstile] TURNSTILE_SECRET_KEY no está definida: la verificación anti-bot está DESACTIVADA en producción y se aceptarán reservas sin comprobar el token.",
  );
}

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
}

export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  if (!TURNSTILE_ENABLED) {
    avisarSiFaltaEnProduccion();
    return true;
  }
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