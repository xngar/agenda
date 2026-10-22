import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { serverEnv } from "@/lib/env";

/**
 * Rate limiting en los endpoints públicos (Upstash).
 *
 * En desarrollo local se permite continuar sin Upstash. En producción, la
 * ausencia o caída del proveedor bloquea el request para no desactivar el
 * límite de forma silenciosa.
 */

type Limiter = Ratelimit;

const limiters = new Map<string, Limiter>();
let redisConfigured: boolean | null = null;

function redisReady(): boolean {
  if (redisConfigured !== null) return redisConfigured;
  const env = serverEnv();
  redisConfigured = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
  return redisConfigured;
}

function getLimiter(scope: string, requests: number, windowMs: number): Limiter {
  const key = `${scope}:${requests}:${windowMs}`;
  const cached = limiters.get(key);
  if (cached) return cached;

  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(requests, `${windowMs} ms`),
    prefix: `agenda:${scope}`,
    analytics: true,
    timeout: 2_000,
  });

  limiters.set(key, limiter);
  return limiter;
}

/**
 * @returns `null` si no hay rate limiting configurado (se permite pasar),
 *          `{ ok, remaining, reset }` en el resto de los casos.
 */
export async function checkRateLimit(
  scope: string,
  identifier: string,
  opts: { requests: number; windowMs: number },
): Promise<{ ok: boolean; remaining: number; reset: number; available: boolean } | null> {
  if (!redisReady()) {
    if (process.env.NODE_ENV !== "production") return null;
    console.error(`[ratelimit] Upstash no está configurado para ${scope}`);
    return { ok: false, remaining: 0, reset: Date.now(), available: false };
  }

  try {
    const limiter = getLimiter(scope, opts.requests, opts.windowMs);
    const result = await limiter.limit(identifier);
    return { ok: result.success, remaining: result.remaining, reset: result.reset, available: true };
  } catch (error) {
    console.error(`[ratelimit] Upstash no disponible para ${scope}`);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ratelimit] fallo local; se permite continuar", error);
      return null;
    }
    return { ok: false, remaining: 0, reset: Date.now(), available: false };
  }
}

/** Identidad estable paraanonimatos: IP + user-agent. */
export function clientIdentity(request: Request): string {
  const headers = request.headers;
  const ip =
    headers.get("x-vercel-forwarded-for") ??
    headers.get("x-forwarded-for") ??
    headers.get("x-real-ip") ??
    "local";
  const ua = headers.get("user-agent") ?? "desconocido";
  return `${ip.split(",")[0]?.trim()}|${ua.slice(0, 120)}`;
}