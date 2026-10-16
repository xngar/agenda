import { NextResponse } from "next/server";
import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { bookAppointmentByStaff } from "@/lib/booking";
import { BusinessError, isInfraError } from "@/lib/errors";
import { normalizeRut } from "@/lib/rut";
import { normalizePhone } from "@/lib/phone";
import { staffBookingSchema } from "@/lib/validation";

/**
 * Reserva creada por el equipo desde el dashboard.
 *
 * Nace `confirmed` (el staff ya verificó al paciente) y envía la
 * confirmación por correo igual que la reserva web. Sin captcha ni rate
 * limit público: la sesión autenticada reemplaza esas defensas.
 *
 * Autorización: recepción y admin reservan para cualquier profesional de
 * la organización; un profesional sólo para sí mismo. El servicio y el
 * profesional deben pertenecer a la organización de la sesión.
 */
export async function POST(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = staffBookingSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa los datos" },
      { status: 422 },
    );
  }
  const { serviceId, doctorId, slotStart, fullName, rut, phone, email } = parsed.data;

  const supabase = await supabaseServer();

  const { data: service } = await supabase
    .from("services")
    .select("id, org_id, active")
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

  try {
    const result = await bookAppointmentByStaff({
      fullName: fullName.trim(),
      rut: normalizeRut(rut),
      phone: normalizePhone(phone),
      email,
      serviceId,
      doctorId,
      slotStart,
      consent: true,
    });
    return NextResponse.json(
      { ok: true, appointmentId: result.appointmentId, startsAt: result.startsAt },
      { status: 201 },
    );
  } catch (error) {
    if (isInfraError(error)) {
      console.error("[staff-booking] infra:", error instanceof Error ? error.message : "desconocido");
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
    console.error("[staff-booking] error inesperado:", error instanceof Error ? error.name : "desconocido");
    return NextResponse.json(
      { error: "No pudimos completar la reserva. Intenta en unos minutos." },
      { status: 500 },
    );
  }
}
