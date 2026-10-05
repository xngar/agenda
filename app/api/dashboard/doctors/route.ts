import { NextResponse } from "next/server";
import { z } from "zod";
import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
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