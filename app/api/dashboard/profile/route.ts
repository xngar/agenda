import { NextResponse } from "next/server";
import { getDoctorSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validation";

/**
 * Mi perfil: lectura y edición del propio nombre y especialidad.
 *
 * Disponible para todo usuario autenticado del panel (profesional,
 * recepción y admin de la organización). El super-admin opera en el área
 * de plataforma y no usa esta ruta.
 *
 * La escritura usa `service_role` con whitelist explícita de columnas
 * (`full_name`, `specialty`): RLS permite actualizar la propia fila, pero
 * su `WITH CHECK` no restringe columnas y un update directo permitiría
 * auto-escalarse `is_admin`/`role`/`org_id`. Acá eso es imposible porque
 * el cuerpo nunca llega a esas columnas.
 */
export async function GET() {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }
  if (session.isSuperAdmin) {
    return NextResponse.json({ error: "Esta ruta no es para el equipo de plataforma" }, { status: 403 });
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("doctors")
    .select("id, full_name, specialty, role, is_admin")
    .eq("id", session.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo leer tu perfil" }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }
  if (session.isSuperAdmin) {
    return NextResponse.json({ error: "Esta ruta no es para el equipo de plataforma" }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa los datos" },
      { status: 422 },
    );
  }

  const specialty = parsed.data.specialty?.trim() ? parsed.data.specialty.trim() : null;

  const { data, error } = await supabaseAdmin()
    .from("doctors")
    .update({ full_name: parsed.data.fullName.trim(), specialty })
    .eq("id", session.id)
    .eq("org_id", session.orgId)
    .select("id, full_name, specialty")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo actualizar tu perfil" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, profile: data });
}
