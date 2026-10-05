"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let cached: BrowserClient | null = null;

/**
 * Cliente de Supabase para el navegador del panel.
 *
 * Se usa `createBrowserClient` de `@supabase/ssr` y NO `createClient` de
 * `@supabase/supabase-js`: el primero escribe la sesión en cookies
 * httpOnly que el servidor sí puede leer en el render. Con localStorage
 * el login "funciona" en el cliente pero el proxy y cada Server Component
 * seguirían viendo al usuario como anónimo.
 *
 * Sólo lleva la anon key: todo lo que salga de acá está sujeto a RLS.
 */
export function supabaseBrowser(): BrowserClient | null {
  if (cached) return cached;

  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  cached = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return cached;
}