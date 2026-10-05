import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/**
 * Cliente con service role. SOLO en servidor (importar `server-only` lo
 * hace fallar en build si alguien lo importa desde el navegador).
 *
 * Esta clave salta RLS: es la única forma de escribir patients y
 * appointments desde el flujo anónimo, y por eso todas las mutaciones
 * pasan por funciones SECURITY DEFINER que revalidan disponibilidad.
 */
let admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  admin ??= createClient(serverEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}