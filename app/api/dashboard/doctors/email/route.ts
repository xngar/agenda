import { NextResponse } from "next/server";
import { z } from "zod";
import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emailSchema, uuidSchema } from "@/lib/validation";

const bodySchema = z.object({
  doctorId: uuidSchema,
  email: emailSchema,
});

/**
 * Cambiar el correo de acceso de un miembro del equipo.
 *
 * Supabase guarda el email en `auth.users`, no en `doctors`, y ahí no hay
 * RLS: la autorización la da el admin de la sesión y el hecho de que el
 * miembro pertenezca a su organización (leído con el cliente de sesión).
 * El propio correo se actualiza con service role, que ya se usa para el alta.
 */
export async function PUT(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  if (!session.isAdmin) {
    return NextResponse.json(
      { error: "Sólo un administrador puede cambiar el correo de acceso" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa el correo" },
      { status: 422 },
    );
  }

  const { doctorId, email } = parsed.data;
  const supabase = await supabaseServer();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, full_name, org_id")
    .eq("id", doctorId)
    .maybeSingle();

  if (!doctor || doctor.org_id !== session.orgId) {
    return NextResponse.json({ error: "Profesional no encontrado" }, { status: 404 });
  }

  const { error: updateError } = await supabaseAdmin().auth.admin.updateUserById(doctorId, {
    email,
    email_confirm: true,
  });

  if (updateError) {
    const alreadyExists =
      updateError.status === 422 || /already|registrad|exists/i.test(updateError.message ?? "");
    return NextResponse.json(
      {
        error: alreadyExists
          ? "Ese correo ya tiene una cuenta; usa otro distinto."
          : "No se pudo cambiar el correo de acceso",
        code: alreadyExists ? "correo_duplicado" : undefined,
      },
      { status: alreadyExists ? 409 : 500 },
    );
  }

  return NextResponse.json({ ok: true, full_name: doctor.full_name });
}
