import { NextResponse } from "next/server";
import { z } from "zod";
import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { sendManualReminder } from "@/lib/booking";

const bodySchema = z.object({
  appointmentId: z.string().uuid(),
});

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

  const { appointmentId } = parsed.data;
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

  if (appointment.status !== "pending" && appointment.status !== "confirmed") {
    return NextResponse.json(
      { error: "Solo se pueden enviar recordatorios para citas activas" },
      { status: 409 },
    );
  }

  const result = await sendManualReminder(appointmentId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "No se pudo enviar el recordatorio" },
      { status: 422 },
    );
  }

  return NextResponse.json({ ok: true });
}

