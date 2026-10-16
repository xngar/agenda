import { NextResponse } from "next/server";
import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { rescheduleById } from "@/lib/booking";
import { BusinessError, isInfraError } from "@/lib/errors";
import { staffRescheduleSchema } from "@/lib/validation";

/**
 * Reprogramación hecha por el equipo desde el dashboard.
 *
 * Mueve la cita conservando paciente, servicio e historial, y avisa por
 * correo al paciente (con su enlace de gestión) y al profesional. Usa
 * reschedule_appointment_by_id, que revalida el slot en-transacción igual
 * que el flujo público: no puede colisionar con una reserva web simultánea.
 *
 * Autorización: recepción y admin mueven citas de cualquier profesional
 * de la organización; un profesional sólo las suyas. No se puede mover
 * una cita cancelada, completada ni pasada (lo rechaza el RPC).
 */
export async function POST(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = staffRescheduleSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa los datos" },
      { status: 422 },
    );
  }
  const { appointmentId, slotStart, doctorId } = parsed.data;

  const supabase = await supabaseServer();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, doctor_id, org_id, status")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appointment || appointment.org_id !== session.orgId) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }
  if (
    appointment.doctor_id !== session.id &&
    !session.isAdmin &&
    session.role !== "reception"
  ) {
    return NextResponse.json({ error: "Esa cita no está asignada a ti" }, { status: 403 });
  }

  const destino = doctorId ?? appointment.doctor_id;
  if (destino !== appointment.doctor_id) {
    const { data: target } = await supabase
      .from("doctors")
      .select("id, org_id, active, role")
      .eq("id", destino)
      .maybeSingle();
    if (!target || target.org_id !== session.orgId || !target.active || target.role !== "professional") {
      return NextResponse.json({ error: "Profesional no disponible" }, { status: 422 });
    }
    if (destino !== session.id && !session.isAdmin && session.role !== "reception") {
      return NextResponse.json({ error: "Esa agenda no está asignada a ti" }, { status: 403 });
    }
  }

  try {
    const view = await rescheduleById(appointmentId, slotStart, doctorId ?? null);
    return NextResponse.json({ ok: true, startsAt: view.startsAt, endsAt: view.endsAt });
  } catch (error) {
    if (isInfraError(error)) {
      console.error("[staff-reschedule] infra:", error instanceof Error ? error.message : "desconocido");
      return NextResponse.json(
        { error: "No pudimos contactar la base de datos. Intenta en unos minutos.", code: "infra" },
        { status: 500 },
      );
    }
    if (error instanceof BusinessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("[staff-reschedule] error inesperado:", error instanceof Error ? error.name : "desconocido");
    return NextResponse.json(
      { error: "No pudimos reprogramar la cita. Intenta en unos minutos." },
      { status: 500 },
    );
  }
}
