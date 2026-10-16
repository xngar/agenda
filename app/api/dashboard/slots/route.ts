import { NextResponse } from "next/server";
import { z } from "zod";
import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { getSlotsForDay } from "@/lib/booking";
import { isValidDayKey } from "@/lib/dates";
import { uuidSchema } from "@/lib/validation";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").optional(),
  serviceId: uuidSchema.optional(),
  doctorId: uuidSchema.optional(),
  appointmentId: uuidSchema.optional(),
});

/**
 * Horarios disponibles para el equipo (wizard de reserva y reagendar).
 *
 * Dos modos: `date + serviceId + doctorId` (nueva reserva) o
 * `appointmentId` (reagendar: la duración sale del servicio de la cita).
 * Sin rate limit público: la sesión autenticada reemplaza esa defensa.
 * Mismas reglas de rol que el resto del dashboard.
 */
export async function GET(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: url.searchParams.get("date") ?? undefined,
    serviceId: url.searchParams.get("serviceId") ?? undefined,
    doctorId: url.searchParams.get("doctorId") ?? undefined,
    appointmentId: url.searchParams.get("appointmentId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const supabase = await supabaseServer();
  let day: string;
  let serviceId: string;
  let doctorId: string;

  if (parsed.data.appointmentId) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, doctor_id, service_id, org_id, status")
      .eq("id", parsed.data.appointmentId)
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
    if (!appointment.service_id) {
      return NextResponse.json({ error: "La cita no tiene servicio asociado" }, { status: 422 });
    }
    const override = url.searchParams.get("date");
    if (override && !isValidDayKey(override)) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    const overrideDoctor = url.searchParams.get("doctorId") ?? undefined;
    day = override ?? new Date().toISOString().slice(0, 10);
    serviceId = appointment.service_id;
    doctorId = overrideDoctor ?? appointment.doctor_id;
  } else {
    if (!parsed.data.date || !isValidDayKey(parsed.data.date) || !parsed.data.serviceId || !parsed.data.doctorId) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }
    day = parsed.data.date;
    serviceId = parsed.data.serviceId;
    doctorId = parsed.data.doctorId;
  }

  const { data: service } = await supabase
    .from("services")
    .select("id, org_id, active, duration_min")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service || service.org_id !== session.orgId || !service.active) {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 422 });
  }

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, org_id, active, role")
    .eq("id", doctorId)
    .maybeSingle();
  if (!doctor || doctor.org_id !== session.orgId || !doctor.active || doctor.role !== "professional") {
    return NextResponse.json({ error: "Profesional no disponible" }, { status: 422 });
  }
  if (doctorId !== session.id && !session.isAdmin && session.role !== "reception") {
    return NextResponse.json({ error: "Esa agenda no está asignada a ti" }, { status: 403 });
  }

  const slots = await getSlotsForDay(day, service.duration_min, doctorId, session.orgId);
  return NextResponse.json({ slots });
}
