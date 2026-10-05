import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();

  // El origen se toma de la petición: `NEXT_PUBLIC_APP_URL` puede no
  // estar definida y `new URL(ruta, undefined)` lanza ERR_INVALID_URL.
  const { origin } = new URL(request.url);

  // Se borra con POST para que un <img src="/api/auth/logout"> ni un
  // prefetch del navegador puedan cerrar la sesión de alguien.
  return NextResponse.redirect(`${origin}/dashboard/login`, { status: 303 });
}