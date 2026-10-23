import { NextResponse } from "next/server";
import { getDoctorSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validation";

function faltaMigracionAvatar(error: { code?: string; message?: string }): boolean {
  if (!error.message?.includes("avatar_path")) return false;
  return error.code === "42703" || error.code === "PGRST204" || error.message.toLowerCase().includes("schema cache");
}

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
    .select("id, full_name, specialty, avatar_path, role, is_admin")
    .eq("id", session.id)
    .maybeSingle();

  if (error || !data) {
    if (error && faltaMigracionAvatar(error)) {
      return NextResponse.json(
        {
          error:
            "Las fotos de perfil aún no están habilitadas en la base de datos. Aplica la migración 20261023130000_doctor_profile_avatar.sql y vuelve a intentarlo.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "No se pudo leer tu perfil" }, { status: 500 });
  }
  const { avatar_path: _avatarPath, ...profile } = data;
  return NextResponse.json({ profile: { ...profile, hasAvatar: Boolean(_avatarPath) } });
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
