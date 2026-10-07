import { NextResponse } from "next/server";
import { z } from "zod";
import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { toBusinessError } from "@/lib/errors";

/**
 * Los valores coinciden EXACTAMENTE con el CHECK
 * `appointments_status_check` de la base:
 *   pending | confirmed | cancelled | completed | no_show
 *
 * Usar nombres propios (por ejemplo "confirm") haría fallar el CHECK con
 * un 23514 y el panel no podría confirmar nada.
 *
 * `reopen` no es un estado: es la acción de revertir una cancelación, y
 * se traduce a `confirmed` con los campos de cancelación limpiados.
 */
const bodySchema = z.object({
  appointmentId: z.string().uuid(),
  action: z.enum(["confirmed", "cancelled", "completed", "no_show", "reopen"]),
  reason: z.string().trim().max(500).optional(),
});

/**
 * Cambio de estado de una cita desde el panel.
 *
 * La autorización NO se toma del id que envía el cliente: se resuelve la
 * sesión contra la base y se comprueba que la cita pertenezca a ese
 * profesional (o a cualquiera, si es admin o recepción: la recepción
 * gestiona la agenda del equipo cuando el profesional no está). Aunque
 * RLS ya impide que un doctor toque citas ajenas, se revalida aquí para
 * que el error sea explícito en vez de un 403 opaco.
 */
export async function POST(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const { appointmentId, action, reason } = parsed.data;
  const supabase = await supabaseServer();

  const { data: appointment, error: readError } = await supabase
    .from("appointments")
    .select("id, doctor_id, status")
    .eq("id", appointmentId)
    .maybeSingle();

  if (readError || !appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  if (appointment.doctor_id !== session.id && !session.isAdmin && session.role !== "reception") {
    return NextResponse.json(
      { error: "Esa cita no está asignada a ti" },
      { status: 403 },
    );
  }

  if (appointment.status === "cancelled" && action !== "reopen") {
    return NextResponse.json(
      { error: "Una cita cancelada no puede cambiar de estado" },
      { status: 409 },
    );
  }

  if (action === "reopen") {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "confirmed", cancelled_by: null, cancel_reason: null })
      .eq("id", appointmentId);
    if (error) return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
    return NextResponse.json({ ok: true, status: "confirmed" });
  }

  const patch: Record<string, string | null> = { status: action };
  if (action === "cancelled") {
    patch.cancelled_by = "doctor";
    patch.cancel_reason = reason?.length ? reason : "Cancelada desde el panel";
  }

  const { error } = await supabase.from("appointments").update(patch).eq("id", appointmentId);

  if (error) {
    const business = toBusinessError(error);
    return NextResponse.json(
      { error: business.message, code: business.code },
      { status: business.status },
    );
  }

  return NextResponse.json({ ok: true, status: action });
}