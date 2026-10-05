import "server-only";

import { supabaseAdmin } from "./supabase/admin";
import { serverEnv } from "./env";
import { BusinessError, toBusinessError } from "./errors";
import { buildIcs } from "./ics";
import { CLINIC_ADDRESS } from "./clinic";
import { sendEmail, maskEmail } from "./email/send";
import {
  bookingCancelledHtml,
  bookingConfirmedHtml,
  bookingReminderHtml,
  bookingRescheduledHtml,
  doctorChangeHtml,
  doctorNewBookingHtml,
} from "./email/templates";
import { formatDateLong, formatRange, DEFAULT_TIMEZONE } from "./dates";
import { generateManageToken, hashManageToken, isManageTokenShape } from "./token";
import { isValidRut } from "./rut";
import { parseRange } from "./range";
import type {
  ClinicSettings,
  Holiday,
  PatientAppointmentView,
  PublicDoctor,
  Service,
  Slot,
  SlotWithDoctor,
} from "./types";
import type { PatientDetailsInput } from "./validation";

/**
 * Orquestación de reservas en el servidor.
 *
 * Ninguna disponibilidad se calcula acá: se pregunta a Postgres, que es
 * la única fuente de verdad sobre la zona horaria y las reglas.
 */

export interface Catalog {
  settings: ClinicSettings;
  services: Service[];
  doctors: PublicDoctor[];
  holidays: Holiday[];
}

const APPOINTMENT_SELECT = `
  id,
  status,
  during,
  cancelled_by,
  cancel_reason,
  reminder_sent_at,
  doctor_id,
  service_id,
  patient_id,
  patients ( id, full_name, rut, phone, email ),
  doctors ( id, full_name, specialty ),
  services ( id, name, duration_min )
`;

type AppointmentRow = {
  id: string;
  status: PatientAppointmentView["status"];
  during: string;
  cancelled_by: "patient" | "doctor" | null;
  cancel_reason: string | null;
  reminder_sent_at: string | null;
  doctor_id: string;
  service_id: string | null;
  patient_id: string;
  patients: { id: string; full_name: string; rut: string | null; phone: string | null; email: string } | null;
  doctors: { id: string; full_name: string; specialty: string | null } | null;
  services: { id: string; name: string; duration_min: number } | null;
};

/* ------------------------------------------------------------------ */
/* Catálogo público                                                     */
/* ------------------------------------------------------------------ */

export async function getCatalog(): Promise<Catalog> {
  const supabase = supabaseAdmin();

  const [settings, services, doctors, holidays] = await Promise.all([
    supabase.from("clinic_settings").select("*").eq("id", 1).single(),
    supabase.from("services").select("id, name, duration_min, active").eq("active", true),
    supabase.from("doctors").select("id, full_name, specialty").eq("active", true),
    supabase.from("clinic_holidays").select("date, name"),
  ]);

  if (settings.error) throw new Error("No se pudo leer clinic_settings");
  if (services.error) throw new Error("No se pudieron leer los servicios");
  if (doctors.error) throw new Error("No se pudieron leer los profesionales");
  if (holidays.error) throw new Error("No se pudieron leer los feriados");

  return {
    settings: settings.data as ClinicSettings,
    services: (services.data ?? []) as Service[],
    doctors: (doctors.data ?? []) as PublicDoctor[],
    holidays: (holidays.data ?? []) as Holiday[],
  };
}

export async function getService(id: string): Promise<Service | null> {
  const { data } = await supabaseAdmin()
    .from("services")
    .select("id, name, duration_min")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();
  return (data as Service | null) ?? null;
}

/* ------------------------------------------------------------------ */
/* Disponibilidad                                                       */
/* ------------------------------------------------------------------ */

export async function getSlotsForDay(
  day: string,
  durationMin: number,
  doctorId: string | null,
): Promise<Slot[]> {
  const supabase = supabaseAdmin();

  const { data, error } = doctorId
    ? await supabase.rpc("get_available_slots", {
        p_doctor: doctorId,
        p_date: day,
        p_duration: durationMin,
      })
    : await supabase.rpc("get_available_slots_any", {
        p_date: day,
        p_duration: durationMin,
      });

  if (error) {
    console.warn("[disponibilidad] rpc falló:", error.message);
    return [];
  }

  return (data ?? []).map((row: Slot | SlotWithDoctor) => ({
    slot_start: row.slot_start as string,
    slot_end: row.slot_end as string,
  }));
}

/** Agrupa los horarios de "cualquiera disponible" por hora. */
export function groupSlotsByStart(slots: SlotWithDoctor[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const slot of slots) {
    const list = map.get(slot.slot_start) ?? [];
    list.push(slot.doctor_id);
    map.set(slot.slot_start, list);
  }
  return map;
}

export async function getSlotsWithDoctor(
  day: string,
  durationMin: number,
  doctorId: string | null,
): Promise<SlotWithDoctor[]> {
  const supabase = supabaseAdmin();

  if (doctorId) {
    const slots = await getSlotsForDay(day, durationMin, doctorId);
    return slots.map((slot) => ({ ...slot, doctor_id: doctorId }));
  }

  const { data, error } = await supabase.rpc("get_available_slots_any", {
    p_date: day,
    p_duration: durationMin,
  });
  if (error) return [];
  return (data ?? []) as SlotWithDoctor[];
}

/* ------------------------------------------------------------------ */
/* Reserva                                                              */
/* ------------------------------------------------------------------ */

export interface BookResult {
  appointmentId: string;
  token: string;
  doctorId: string;
  startsAt: string;
  endsAt: string;
  serviceName: string;
  doctorName: string;
  clinicName: string;
  clinicTimezone: string;
  specialty: string | null;
}

export async function bookAppointment(input: PatientDetailsInput): Promise<BookResult> {
  const supabase = supabaseAdmin();

  // Defensa en profundidad: el esquema de Zod ya valida el dígito
  // verificador, así que llegar acá significa que alguien llamó a la
  // función saltándose la ruta HTTP. El mensaje es explícito para que no
  // se confunda con un problema de disponibilidad.
  if (!isValidRut(input.rut)) {
    throw new BusinessError("A0006", 422);
  }

  const service = await getService(input.serviceId);
  if (!service) throw new BusinessError("A0002", 422);

  const doctorId = await resolveDoctor(input.doctorId, input.slotStart, service.duration_min);
  const token = generateManageToken();
  const tokenHash = hashManageToken(token);

  const { data: appointmentId, error } = await supabase.rpc("book_appointment", {
    p_doctor: doctorId,
    p_service: service.id,
    p_start: input.slotStart,
    p_full_name: input.fullName,
    p_rut: input.rut,
    p_phone: input.phone,
    p_email: input.email,
    p_token_hash: tokenHash,
  });

  if (error) throw toBusinessError(error);
  if (!appointmentId) throw new BusinessError("A0002");

  await sealToken(appointmentId as string, token);

  const settings = await getSettings();
  const row = await loadAppointmentRow(appointmentId as string);
  const doctor = row?.doctors;
  const startsAt = lowerBound(row?.during);
  const endsAt = upperBound(row?.during);

  await Promise.all([
    sendConfirmationEmail({
      to: input.email,
      patientName: input.fullName,
      clinicName: settings.name,
      doctorName: doctor?.full_name ?? "Profesional",
      specialty: doctor?.specialty ?? null,
      serviceName: service.name,
      startsAt,
      endsAt,
      timezone: settings.timezone,
      manageUrl: manageUrl(token),
      appointmentId: appointmentId as string,
    }),
    notifyDoctorNewBooking({
      doctorId,
      clinicName: settings.name,
      patientName: input.fullName,
      serviceName: service.name,
      startsAt,
      endsAt,
      timezone: settings.timezone,
    }),
  ]);

  return {
    appointmentId: appointmentId as string,
    token,
    doctorId,
    startsAt,
    endsAt,
    serviceName: service.name,
    doctorName: doctor?.full_name ?? "Profesional",
    clinicName: settings.name,
    clinicTimezone: settings.timezone,
    specialty: doctor?.specialty ?? null,
  };
}

/** Elige el primer doctor libre si el paciente pidió "cualquiera". */
async function resolveDoctor(
  doctorId: string | null,
  slotStart: string,
  durationMin: number,
): Promise<string> {
  if (doctorId) return doctorId;

  const day = slotStart.slice(0, 10);
  const { data, error } = await supabaseAdmin().rpc("get_available_slots_any", {
    p_date: day,
    p_duration: durationMin,
  });
  if (error) throw new BusinessError("A0002");

  // Comparamos por instante, no por texto: Postgres puede devolver el
  // timestamptz como `2026-10-05T11:00:00-03:00` y el cliente lo manda
  // como `2026-10-05T14:00:00.000Z`. Son la misma hora y ambas formas
  // son válidas.
  const target = new Date(slotStart).getTime();
  const rows = (data ?? []) as SlotWithDoctor[];
  const match = rows.find((row) => new Date(row.slot_start).getTime() === target);
  if (!match) throw new BusinessError("A0001");

  return match.doctor_id;
}

async function getSettings(): Promise<ClinicSettings> {
  const { data } = await supabaseAdmin().from("clinic_settings").select("*").eq("id", 1).single();
  if (!data) throw new Error("clinic_settings sin fila");
  return data as ClinicSettings;
}

/* ------------------------------------------------------------------ */
/* Gestión por token                                                    */
/* ------------------------------------------------------------------ */

export async function loadAppointmentRow(appointmentId: string): Promise<AppointmentRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) return null;
  return (data as unknown as AppointmentRow) ?? null;
}

export async function getAppointmentByToken(token: string): Promise<{
  row: AppointmentRow;
  manageUrl: string;
} | null> {
  if (!isManageTokenShape(token)) return null;

  const tokenHash = hashManageToken(token);
  const { data, error } = await supabaseAdmin()
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("manage_token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;
  return { row: data as unknown as AppointmentRow, manageUrl: manageUrl(token) };
}

export async function toPatientView(
  row: AppointmentRow,
): Promise<PatientAppointmentView> {
  const settings = await getSettings();
  const startsAt = lowerBound(row.during);
  const endsAt = upperBound(row.during);
  const active = row.status === "pending" || row.status === "confirmed";

  return {
    id: row.id,
    status: row.status,
    startsAt,
    endsAt,
    doctorId: row.doctor_id,
    serviceId: row.service_id,
    doctorName: row.doctors?.full_name ?? "Profesional",
    specialty: row.doctors?.specialty ?? null,
    serviceName: row.services?.name ?? "Atención",
    clinicName: settings.name,
    clinicTimezone: settings.timezone || DEFAULT_TIMEZONE,
    patientName: row.patients?.full_name ?? "",
    canModify: active && new Date(endsAt).getTime() > Date.now(),
    cancelReason: row.cancel_reason,
    cancelledBy: row.cancelled_by,
  };
}

export async function rescheduleByToken(
  token: string,
  slotStart: string,
  doctorId: string | null,
): Promise<{ appointment: PatientAppointmentView; token: string }> {
  if (!isManageTokenShape(token)) throw new BusinessError("A0003", 404);

  const tokenHash = hashManageToken(token);
  const supabase = supabaseAdmin();

  const { data, error } = await supabase.rpc("reschedule_appointment", {
    p_token_hash: tokenHash,
    p_start: slotStart,
    p_doctor: doctorId,
  });

  if (error) throw toBusinessError(error);
  if (!data) throw new BusinessError("A0002");

  const row = await loadAppointmentRow(data as string);
  if (!row) throw new BusinessError("A0003", 404);

  const settings = await getSettings();
  const view = await toPatientView(row);

  await Promise.all([
    sendRescheduleEmail({
      to: row.patients?.email ?? "",
      view,
      clinicName: settings.name,
      timezone: settings.timezone,
      manageUrl: manageUrl(token),
    }),
    notifyDoctorChange(row.doctor_id, row.patients?.full_name ?? "Paciente", view, "rescheduled", settings),
  ]);

  return { appointment: view, token };
}

export async function cancelByToken(
  token: string,
  reason: string | undefined,
): Promise<PatientAppointmentView> {
  if (!isManageTokenShape(token)) throw new BusinessError("A0003", 404);

  const tokenHash = hashManageToken(token);
  const supabase = supabaseAdmin();

  const { data, error } = await supabase.rpc("cancel_appointment", {
    p_token_hash: tokenHash,
    p_reason: reason ?? null,
  });

  if (error) throw toBusinessError(error);
  if (!data) throw new BusinessError("A0002");

  const row = await loadAppointmentRow(data as string);
  if (!row) throw new BusinessError("A0003", 404);

  const settings = await getSettings();
  const view = await toPatientView(row);

  await Promise.all([
    sendEmail({
      to: row.patients?.email ?? "",
      subject: `Cita cancelada · ${settings.name}`,
      html: bookingCancelledHtml({
        patientName: row.patients?.full_name ?? "",
        clinicName: settings.name,
        doctorName: view.doctorName,
        specialty: view.specialty,
        serviceName: view.serviceName,
        dateLabel: formatDateLong(view.startsAt, settings.timezone),
        timeLabel: formatRange(view.startsAt, view.endsAt, settings.timezone),
        clinicAddress: CLINIC_ADDRESS,
        reason: reason ?? null,
        manageUrl: manageUrl(token),
      }),
    }),
    notifyDoctorChange(
      row.doctor_id,
      row.patients?.full_name ?? "Paciente",
      view,
      "cancelled",
      settings,
    ),
  ]);

  return view;
}

/* ------------------------------------------------------------------ */
/* Correos                                                              */
/* ------------------------------------------------------------------ */

function manageUrl(token: string): string {
  return `${serverEnv().NEXT_PUBLIC_APP_URL}/cita/${token}`;
}

async function sealToken(appointmentId: string, token: string): Promise<void> {
  const { error } = await supabaseAdmin().rpc("seal_manage_token", {
    p_appointment: appointmentId,
    p_token: token,
    p_key: serverEnv().MANAGE_TOKEN_KEY,
  });
  if (error) console.warn("[token] no se pudo sellar el token de gestión");
}

async function sendConfirmationEmail(args: {
  to: string;
  patientName: string;
  clinicName: string;
  doctorName: string;
  specialty: string | null;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  manageUrl: string;
  appointmentId: string;
}): Promise<void> {
  if (!args.to) return;

  const ics = buildIcs({
    uid: args.appointmentId,
    startsAt: args.startsAt,
    endsAt: args.endsAt,
    summary: `${args.serviceName} · ${args.clinicName}`,
    description: `Cita con ${args.doctorName}${
      args.specialty ? ` (${args.specialty})` : ""
    }. Gestionar cita: ${args.manageUrl}`,
    location: `${args.clinicName}, ${CLINIC_ADDRESS}`,
    url: args.manageUrl,
    timezone: args.timezone,
  });

  const result = await sendEmail({
    to: args.to,
    subject: `Cita confirmada · ${args.clinicName}`,
    html: bookingConfirmedHtml({
      patientName: args.patientName,
      clinicName: args.clinicName,
      doctorName: args.doctorName,
      specialty: args.specialty,
      serviceName: args.serviceName,
      dateLabel: formatDateLong(args.startsAt, args.timezone),
      timeLabel: formatRange(args.startsAt, args.endsAt, args.timezone),
      clinicAddress: CLINIC_ADDRESS,
      manageUrl: args.manageUrl,
    }),
    text: `Cita confirmada: ${args.serviceName} con ${args.doctorName} el ${formatDateLong(
      args.startsAt,
      args.timezone,
    )}. Gestiona tu cita en ${args.manageUrl}`,
    attachments: [{ filename: "cita.ics", content: ics }],
  });

  if (!result.ok) console.warn("[correo] no se pudo confirmar la cita de", maskEmail(args.to));
}

async function sendRescheduleEmail(args: {
  to: string;
  view: PatientAppointmentView;
  clinicName: string;
  timezone: string;
  manageUrl: string;
}): Promise<void> {
  if (!args.to) return;

  await sendEmail({
    to: args.to,
    subject: `Cita reprogramada · ${args.clinicName}`,
    html: bookingRescheduledHtml({
      patientName: args.view.patientName,
      clinicName: args.clinicName,
      doctorName: args.view.doctorName,
      specialty: args.view.specialty,
      serviceName: args.view.serviceName,
      dateLabel: formatDateLong(args.view.startsAt, args.timezone),
      timeLabel: formatRange(args.view.startsAt, args.view.endsAt, args.timezone),
      clinicAddress: CLINIC_ADDRESS,
      manageUrl: args.manageUrl,
    }),
    text: `Tu cita fue reprogramada a ${formatDateLong(
      args.view.startsAt,
      args.timezone,
    )}, ${formatRange(args.view.startsAt, args.view.endsAt, args.timezone)}. Gestiona tu cita en ${
      args.manageUrl
    }`,
  });
}

async function notifyDoctorNewBooking(args: {
  doctorId: string;
  clinicName: string;
  patientName: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
}): Promise<void> {
  const email = await doctorEmail(args.doctorId);
  if (!email) return;

  await sendEmail({
    to: email,
    subject: `Nueva reserva · ${args.clinicName}`,
    html: doctorNewBookingHtml({
      clinicName: args.clinicName,
      patientName: args.patientName,
      serviceName: args.serviceName,
      dateLabel: formatDateLong(args.startsAt, args.timezone),
      timeLabel: formatRange(args.startsAt, args.endsAt, args.timezone),
      dashboardUrl: `${serverEnv().NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  });
}

async function notifyDoctorChange(
  doctorId: string,
  patientName: string,
  view: PatientAppointmentView,
  change: "rescheduled" | "cancelled",
  settings: ClinicSettings,
): Promise<void> {
  const email = await doctorEmail(doctorId);
  if (!email) return;

  await sendEmail({
    to: email,
    subject: change === "cancelled" ? "Cita cancelada" : "Cita reprogramada",
    html: doctorChangeHtml(change, {
      clinicName: settings.name,
      patientName,
      serviceName: view.serviceName,
      dateLabel: formatDateLong(view.startsAt, settings.timezone),
      timeLabel: formatRange(view.startsAt, view.endsAt, settings.timezone),
      dashboardUrl: `${serverEnv().NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  });
}

async function doctorEmail(doctorId: string): Promise<string | null> {
  // El correo vive en auth.users; el catálogo público sólo expone nombre.
  const { data, error } = await supabaseAdmin().auth.admin.getUserById(doctorId);
  if (error || !data?.user) return null;
  return data.user.email ?? null;
}

/* ------------------------------------------------------------------ */
/* Recordatorios                                                        */
/* ------------------------------------------------------------------ */

export interface ReminderSummary {
  sent: number;
  skipped: number;
  failed: number;
}

/**
 * Envía los recordatorios de las próximas 24 h.
 *
 * `claim_due_reminders()` marca `reminder_sent_at` en la misma
 * transacción que devuelve las filas, así que aunque el envío falle la
 * clínica no reintenta en bucle; si el correo se pierde, la clínica lo
 * gestiona desde el dashboard.
 */
export async function sendDueReminders(): Promise<ReminderSummary> {
  const supabase = supabaseAdmin();
  const settings = await getSettings();

  const { data, error } = await supabase.rpc("claim_due_reminders");
  if (error) {
    console.warn("[recordatorios] claim_due_reminders falló:", error.message);
    return { sent: 0, skipped: 0, failed: 0 };
  }

  const rows = (data ?? []) as {
    appointment_id: string;
    doctor_id: string;
    patient_email: string;
    patient_name: string;
    service_name: string | null;
    starts_at: string;
  }[];

  const summary: ReminderSummary = { sent: 0, skipped: 0, failed: 0 };

  for (const row of rows) {
    const token = await openToken(row.appointment_id);
    if (!token) {
      summary.skipped += 1;
      continue;
    }

    const appointment = await loadAppointmentRow(row.appointment_id);
    if (!appointment) {
      summary.skipped += 1;
      continue;
    }

    const startsAt = lowerBound(appointment.during);
    const endsAt = upperBound(appointment.during);

    const result = await sendEmail({
      to: row.patient_email,
      subject: `Recordatorio de cita · ${settings.name}`,
      html: bookingReminderHtml({
        patientName: row.patient_name,
        clinicName: settings.name,
        doctorName: appointment.doctors?.full_name ?? "Profesional",
        specialty: appointment.doctors?.specialty ?? null,
        serviceName: row.service_name ?? appointment.services?.name ?? "Atención",
        dateLabel: formatDateLong(startsAt, settings.timezone),
        timeLabel: formatRange(startsAt, endsAt, settings.timezone),
        clinicAddress: CLINIC_ADDRESS,
        manageUrl: manageUrl(token),
      }),
    });

    if (result.ok) summary.sent += 1;
    else summary.failed += 1;
  }

  return summary;
}

async function openToken(appointmentId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().rpc("open_manage_token", {
    p_appointment: appointmentId,
    p_key: serverEnv().MANAGE_TOKEN_KEY,
  });
  if (error || !data) return null;
  return typeof data === "string" ? data : null;
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                           */
/* ------------------------------------------------------------------ */

function lowerBound(during: string | undefined): string {
  return parseRange(during).start;
}

function upperBound(during: string | undefined): string {
  return parseRange(during).end;
}

export { parseRange } from "./range";