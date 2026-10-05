import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const bodySchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  password: z.string().min(1, "Escribe tu contraseña").max(200),
});

/**
 * Login del profesional.
 *
 * El contraseña se verifica en el servidor para que la sesión quede en
 * cookies httpOnly. Además se exige que exista una fila en `doctors` con
 * `active = true`: autenticarse en Supabase no basta, porque el panel es
 * sólo para profesionales de la clínica.
 *
 * El mensaje de error es deliberadamente genérico para no revelar qué
 * correos existen.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: "Correo o contraseña incorrectos" },
      { status: 401 },
    );
  }

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!doctor) {
    // Sesión abierta pero sin permisos: se cierra para no dejar un token
    // válido de alguien que no es profesional.
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Esta cuenta no está habilitada para el panel" },
      { status: 403 },
    );
  }

  if (!doctor.active) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Tu cuenta está desactivada. Contacta a la administración." },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}