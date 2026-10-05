import { z } from "zod";

/**
 * Variables de entorno del servidor.
 *
 * Se validan una sola vez al importar. Un `.env` incompleto revienta en
 * el arranque del servidor en vez de fallar en producción a media cita.
 */

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  MANAGE_TOKEN_KEY: z.string().min(16),

  RESEND_API_KEY: z.string().min(10).optional(),
  EMAIL_FROM: z.string().default("Clínica <reservas@reservas.clinicadental.test>"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  TURNSTILE_SECRET_KEY: z.string().min(10).optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(10).optional(),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(10).optional(),

  CRON_SECRET: z.string().min(16).optional(),
});

function loadServerEnv() {
  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    MANAGE_TOKEN_KEY: process.env.MANAGE_TOKEN_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Configuración de entorno inválida -> ${issues}`);
  }
  return parsed.data;
}

let cached: z.infer<typeof serverEnvSchema> | null = null;

/** Sólo para servidor (importar en un Client Component rompe el build). */
export function serverEnv() {
  cached ??= loadServerEnv();
  return cached;
}

export function publicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  };
}