import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { serverEnv } from "@/lib/env";

/**
 * Rate limiting en los endpoints públicos (Upstash).
 *
 * Si Upstash no está configurado o no responde, se aplica un límite local
 * para que el servicio siga disponible. Ese respaldo no se comparte entre
 * instancias y se reinicia cuando la instancia se recicla.
 */

type Limiter = Ratelimit;

const limiters = new Map<string, Limiter>();
const localWindows = new Map<string, { count: number; reset: number }>();
const fallbackWarnings = new Set<string>();
let redisConfigured: boolean | null = null;
let lastLocalCleanup = 0;

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  reset: number;
  available: boolean;
};

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

function applyLocalRateLimit(
  scope: string,
  identifier: string,
  opts: { requests: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const key = `${scope}:${opts.requests}:${opts.windowMs}:${identifier}`;
  let window = localWindows.get(key);

  if (!window || window.reset <= now) {
    window = { count: 0, reset: now + opts.windowMs };
    localWindows.set(key, window);
  }

  if (now - lastLocalCleanup >= 60_000) {
    for (const [entryKey, entry] of localWindows) {
      if (entry.reset <= now) localWindows.delete(entryKey);
    }
    lastLocalCleanup = now;
  }

  window.count += 1;
  return {
    ok: window.count <= opts.requests,
    remaining: Math.max(0, opts.requests - window.count),
    reset: window.reset,
    available: true,
  };
}

function warnFallback(scope: string, reason: "not configured" | "unavailable") {
  if (fallbackWarnings.has(scope)) return;
  fallbackWarnings.add(scope);
  console.warn(`[ratelimit] Upstash ${reason} para ${scope}; usando límite en memoria`);
}

/**
 * Aplica el límite compartido de Upstash o un respaldo local por instancia.
 */
export async function checkRateLimit(
  scope: string,
  identifier: string,
  opts: { requests: number; windowMs: number },
): Promise<RateLimitResult> {
  if (!redisReady()) {
    warnFallback(scope, "not configured");
    return applyLocalRateLimit(scope, identifier, opts);
  }

  try {
    const limiter = getLimiter(scope, opts.requests, opts.windowMs);
    const result = await limiter.limit(identifier);
    return { ok: result.success, remaining: result.remaining, reset: result.reset, available: true };
  } catch (error) {
    warnFallback(scope, "unavailable");
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ratelimit] Error de Upstash", error);
    }
    return applyLocalRateLimit(scope, identifier, opts);
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