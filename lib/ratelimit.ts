import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { serverEnv } from "@/lib/env";

/**
 * Rate limiting en los endpoints públicos (Upstash).
 *
 * Sin credenciales de Upstash (desarrollo local) NO bloqueamos: devolvemos
 * `null` y el endpoint sigue funcionando. En producción el `.env.example`
 * exige las variables, así que un despliegue sin ellas es un error visible.
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
): Promise<{ ok: boolean; remaining: number; reset: number } | null> {
  if (!redisReady()) return null;

  try {
    const limiter = getLimiter(scope, opts.requests, opts.windowMs);
    const result = await limiter.limit(identifier);
    return { ok: result.success, remaining: result.remaining, reset: result.reset };
  } catch (error) {
    console.warn("[ratelimit] falló, se permite continuar:", error);
    return null;
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