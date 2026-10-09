import { NextResponse } from "next/server";
import { z } from "zod";
import { getDoctorSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const resetSchema = z.object({
  doctorId: z.string().uuid("Profesional inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña es demasiado larga"),
});

/** Sólo el equipo de la plataforma administra organizaciones. */
async function plataformaAdmin(
  supabase: ReturnType<typeof supabaseAdmin>,
  doctorId: string,
): Promise<boolean> {
  const { data } = await supabase.from("doctors").select("is_super_admin").eq("id", doctorId).maybeSingle();
  return Boolean(data?.is_super_admin);
}

/**
 * Establece una contraseña temporal al administrador (o a cualquier
 * profesional) de una organización. No depende del envío de correos: el
 * super admin la comparte directamente con la clínica.
 */
export async function POST(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  if (!(await plataformaAdmin(supabase, session.id))) {
    return NextResponse.json(
      { error: "Sólo el equipo de la plataforma puede restablecer contraseñas" },
      { status: 403 },
    );
  }

  const raw = await request.json().catch(() => null);
  const body = resetSchema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Revisa los datos" },
      { status: 422 },
    );
  }

  const { doctorId, password } = body.data;

  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id, full_name, org_id, is_admin, is_super_admin")
    .eq("id", doctorId)
    .maybeSingle();

  if (doctorError || !doctor) {
    return NextResponse.json(
      { error: "No existe ese profesional", code: "no_existe" },
      { status: 404 },
    );
  }

  if (doctor.is_super_admin) {
    return NextResponse.json(
      { error: "No se restablece la contraseña del equipo de la plataforma", code: "equipo_plataforma" },
      { status: 409 },
    );
  }

  const { error: resetError } = await supabase.auth.admin.updateUserById(doctorId, { password });

  if (resetError) {
    return NextResponse.json({ error: "No se pudo restablecer la contraseña" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    admin: { name: doctor.full_name, id: doctor.id },
  });
}