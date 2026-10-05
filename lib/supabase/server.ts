import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

/**
 * Cliente ligado a la sesión del doctor (cookies SSR de Supabase).
 * Todas las consultas pasan por RLS, así que un doctor no puede leer
 * citas de otro aunque manipule el id.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(serverEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component: las cookies se escriben en el Route Handler
          // de auth. Ignorarlo es lo esperado en el render.
        }
      },
    },
  });
}