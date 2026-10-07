import { NextResponse } from "next/server";
import { z } from "zod";
import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { doctorSchema } from "@/lib/validation";
import { DEFAULT_AVAILABILITY } from "@/lib/defaults";
import { toBusinessError } from "@/lib/errors";

/**
 * Activar o desactivar la cuenta de un profesional.
 *
 * La autorización se resuelve contra la base, nunca contra un campo que
 * envíe el cliente: `session.isAdmin` viene de leer el doctor de la sesión.
 *
 * RLS ya lo permite (`admin_manage_doctors` en la migración 0004), pero se
 * revalida aquí para poder responder con un mensaje explícito en vez de un
 * 403 opaco de Postgres.
 */
const bodySchema = z.object({
  doctorId: z.string().uuid(),
  active: z.boolean(),
});

export async function PATCH(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  if (!session.isAdmin) {
    return NextResponse.json(
      { error: "Sólo un administrador puede activar o desactivar cuentas" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const { doctorId, active } = parsed.data;

  /*
   * Un administrador no puede desactivar su propia cuenta: el login exige
   * `active`, así que la desactivación sería un cierre de sesión
   * irreversible desde la propia interfaz (otro admin tendría que
   * reactivarla, y si es el único, nadie puede).
   */
  if (doctorId === session.id && !active) {
    return NextResponse.json(
      { error: "No puedes desactivar tu propia cuenta" },
      { status: 409 },
    );
  }

  const supabase = await supabaseServer();

  const { data: updated, error } = await supabase
    .from("doctors")
    .update({ active })
    .eq("id", doctorId)
    .select("id, active")
    .maybeSingle();

  if (error) {
    const business = toBusinessError(error);
    return NextResponse.json(
      { error: business.message, code: business.code },
      { status: business.status },
    );
  }

  if (!updated) {
    return NextResponse.json({ error: "Profesional no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, active: updated.active });
}

/**
 * Alta de un miembro del equipo.
 *
 * Crea la cuenta de acceso (auth.users) y la fila en `doctors` dentro de la
 * organización del admin que pide el alta: `org_id` sale de la sesión, nunca
 * del cuerpo, así que ningún admin puede dar de alta gente en otra clínica.
 *
 * RLS ya lo permite (`admin_manage_doctors`), pero la autorización se
 * resuelve aquí para responder con un mensaje legible. Si la fila en
 * `doctors` no llega a insertarse, se borra el usuario de acceso: es
 * `references auth.users(id) on delete cascade`, así que borrar el usuario
 * limpia `doctors` y `availability_rules` en cascada.
 */
export async function POST(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  if (!session.isAdmin) {
    return NextResponse.json(
      { error: "Sólo un administrador puede agregar miembros del equipo" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = doctorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa los datos" },
      { status: 422 },
    );
  }

  const { email, fullName, password, specialty, role, isAdmin } = parsed.data;

  // 1) Cuenta de acceso primero: es lo que más suele fallar (correo ya
  //    registrado) y así no dejamos un doctor a medias.
  const { data: authUser, error: authError } = await supabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authUser.user) {
    const alreadyExists =
      authError?.status === 422 || /already|registrad|exists/i.test(authError?.message ?? "");
    return NextResponse.json(
      {
        error: alreadyExists
          ? "Ese correo ya tiene una cuenta; usa otro distinto."
          : "No se pudo crear la cuenta de acceso",
        code: alreadyExists ? "correo_duplicado" : undefined,
      },
      { status: alreadyExists ? 409 : 500 },
    );
  }

  const userId = authUser.user.id;
  const supabase = await supabaseServer();

  // 2) Fila del profesional en la organización del admin de sesión.
  const { error: doctorError } = await supabase.from("doctors").insert({
    id: userId,
    full_name: fullName,
    specialty: specialty || null,
    role,
    is_admin: isAdmin,
    active: true,
    org_id: session.orgId,
  });

  if (doctorError) {
    await supabaseAdmin().auth.admin.deleteUser(userId);
    const business = toBusinessError(doctorError);
    return NextResponse.json(
      { error: "No se pudo crear la cuenta del miembro", code: business.code },
      { status: business.status },
    );
  }

  // 3) El profesional nuevo empieza con el mismo horario por defecto con el
  //    que arranca cualquier clínica: si no, no ofrece horas hasta que alguien
  //    lo configure en Horario. La recepción no necesita agenda.
  if (role === "professional") {
    const availabilityRows = DEFAULT_AVAILABILITY.flatMap((rule) =>
      rule.windows.map(([start_time, end_time]) => ({
        doctor_id: userId,
        org_id: session.orgId,
        weekday: rule.weekday,
        start_time,
        end_time,
      })),
    );
    const { error: availabilityError } = await supabase
      .from("availability_rules")
      .insert(availabilityRows);

    if (availabilityError) {
      await supabaseAdmin().auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "No se pudo configurar el horario del miembro" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { ok: true, doctor: { id: userId, full_name: fullName, role } },
    { status: 201 },
  );
}