/**
 * Tipos del dominio. Reflejan las migraciones en supabase/migrations.
 * Se mantienen a mano (no generados) porque son un subconjunto curado:
 * las columnas que el cliente anónimo no puede leer ni siquiera existen
 * en estos tipos.
 */

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "confirmed",
  "pending",
  "cancelled",
  "completed",
  "no_show",
];

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Por confirmar",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Atendida",
  no_show: "No asistió",
};

export type NotificationType = "new_booking" | "rescheduled" | "cancelled";

export interface ClinicSettings {
  org_id?: string;
  slug?: string;
  address?: string;
  phone?: string;
  support_email?: string;
  consent_text?: string;
  id?: 1 | string;
  name: string;
  timezone: string;
  slot_step_min: number;
  min_notice_hours: number;
  max_days_ahead: number;
  cancel_min_hours: number;
}

export interface PublicDoctor {
  id: string;
  full_name: string;
  specialty: string | null;
}

export interface Service {
  id: string;
  name: string;
  duration_min: number;
  active?: boolean;
}

export interface Holiday {
  date: string;
  name: string;
}

export interface Slot {
  slot_start: string;
  slot_end: string;
}

export interface SlotWithDoctor extends Slot {
  doctor_id: string;
}

/** Cita tal como la ve el doctor autenticado (RLS: sólo las propias). */
export interface DoctorAppointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  service_id: string | null;
  during: { start: string; end: string } | string;
  status: AppointmentStatus;
  cancelled_by: "patient" | "doctor" | null;
  cancel_reason: string | null;
  created_at: string;
  patient: { full_name: string; phone: string | null; email: string; rut: string | null } | null;
  service: { name: string; duration_min: number } | null;
}

export interface DoctorNotification {
  id: string;
  doctor_id: string;
  appointment_id: string | null;
  type: NotificationType;
  read_at: string | null;
  created_at: string;
}

/** Datos de la cita que ve el paciente con su token. */
export interface PatientAppointmentView {
  id: string;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  /** Necesarios para volver a consultar disponibilidad al reprogramar. */
  doctorId: string;
  serviceId: string | null;
  doctorName: string;
  specialty: string | null;
  serviceName: string;
  clinicName: string;
  clinicTimezone: string;
  patientName: string;
  canModify: boolean;
  cancelReason: string | null;
  cancelledBy: "patient" | "doctor" | null;
}

/** Errores de negocio de la base (SQLSTATE A000x) y su texto en es-CL. */
export const BUSINESS_ERROR_MESSAGES = {
  A0001: "Esa hora ya fue reservada. Elige otra, por favor.",
  A0002: "Ese horario no está disponible. Elige otra, por favor.",
  A0003: "El enlace no es válido o la cita ya no existe.",
  A0004: "Tu cita está demasiado cerca para cancelarla por internet.",
  A0005: "Esta cita ya no se puede modificar.",
  // No viene de Postgres: lo usa la capa de aplicación cuando el RUT no
  // pasa el dígito verificador. Antes se reportaba como A0002 y el
  // paciente terminaba buscando otra hora por un error de tipeo.
  A0006: "Revisa tu RUT: el dígito verificador no coincide.",
} as const;

export type BusinessErrorCode = keyof typeof BUSINESS_ERROR_MESSAGES;



export interface Organization extends Omit<ClinicSettings, "id"> {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  active: boolean;
}

export type PublicOrganization = Pick<
  Organization,
  "id" | "name" | "slug" | "timezone" | "address" | "phone" | "support_email" | "consent_text"
>;
