import "server-only";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getDoctorSession, isClinical, type DoctorSession } from "@/lib/auth";

export interface FichaContext {
  session: DoctorSession;
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  clinical: boolean;
}

export async function fichaContext(): Promise<FichaContext | null> {
  const session = await getDoctorSession();
  if (!session) return null;
  const supabase = await supabaseServer();
  return { session, supabase, clinical: isClinical(session) };
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
}

export function forbidden(message = "No tienes acceso a la ficha clínica"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "No encontrado"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function invalid(message = "Revisa los datos"): NextResponse {
  return NextResponse.json({ error: message }, { status: 422 });
}

export function conflictMessage(message: string, code?: string): NextResponse {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status: 409 });
}

export function bodyError(error: { issues?: { message?: string }[] }): NextResponse {
  return invalid(error.issues?.[0]?.message ?? "Revisa los datos");
}

export function dbError(error: { message?: string; code?: string }): NextResponse {
  if (error.code === "23505") {
    return conflictMessage("Ese dato ya existe (revisa RUT, correo o nombre repetido)", "duplicado");
  }
  if (error.code === "EFIRM") {
    return conflictMessage("La ficha firmada es inmutable; crea una corrección", "ficha_firmada");
  }
  return NextResponse.json({ error: "No se pudo completar la operación" }, { status: 500 });
}

export async function auditPatientView(
  ctx: FichaContext,
  patientId: string,
  entity: string,
): Promise<NextResponse | null> {
  const { error } = await ctx.supabase.rpc("audit_patient_view_event", {
    p_patient_id: patientId,
    p_entity: entity,
  });
  if (error?.code === "PGRST202" || error?.code === "42883") {
    console.error(
      "[ficha.audit] audit_patient_view_event no está disponible; aplica la migración de endurecimiento de seguridad",
    );
    return null;
  }
  return error ? dbError(error) : null;
}

export interface PatientAccess {
  isAdmin: boolean;
  isReception: boolean;
  linked: boolean;
  canViewClinical: boolean;
  canEditIdentity: boolean;
  canEditClinical: boolean;
  canDelete: boolean;
  canViewAudit: boolean;
}

interface PatientRef {
  id: string;
  org_id?: string | null;
  doctor_id?: string | null;
}

async function hasCareLink(
  ctx: FichaContext,
  patient: PatientRef,
): Promise<boolean> {
  if (patient.doctor_id === ctx.session.id) return true;

  const [appointment, encounter] = await Promise.all([
    ctx.supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.session.orgId)
      .eq("patient_id", patient.id)
      .eq("doctor_id", ctx.session.id),
    ctx.supabase
      .from("encounters")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.session.orgId)
      .eq("patient_id", patient.id)
      .eq("doctor_id", ctx.session.id),
  ]);

  return (appointment.count ?? 0) > 0 || (encounter.count ?? 0) > 0;
}

/**
 * Permisos clínicos por relación con la atención:
 * - admin/superadmin: acceso completo y auditoría;
 * - recepción: sólo datos administrativos;
 * - profesional: sólo pacientes con vínculo asistencial (tratante, cita o
 *   atención propia), y edición clínica mientras no invada registros ajenos.
 */
export async function patientAccess(
  ctx: FichaContext,
  patient: PatientRef,
): Promise<PatientAccess> {
  const isAdmin = ctx.session.isAdmin || ctx.session.isSuperAdmin;

  if (isAdmin) {
    return {
      isAdmin: true,
      isReception: false,
      linked: true,
      canViewClinical: true,
      canEditIdentity: true,
      canEditClinical: true,
      canDelete: true,
      canViewAudit: true,
    };
  }

  if (ctx.session.role === "reception") {
    return {
      isAdmin: false,
      isReception: true,
      linked: false,
      canViewClinical: false,
      canEditIdentity: true,
      canEditClinical: false,
      canDelete: false,
      canViewAudit: false,
    };
  }

  const linked = await hasCareLink(ctx, patient);
  const principal = patient.doctor_id === ctx.session.id;

  return {
    isAdmin: false,
    isReception: false,
    linked,
    canViewClinical: linked,
    canEditIdentity: linked,
    canEditClinical: linked,
    canDelete: principal,
    canViewAudit: principal,
  };
}

export async function orgPatient(
  ctx: FichaContext,
  patientId: string,
): Promise<{
  patient: { id: string; org_id: string; doctor_id: string | null } | null;
  access: PatientAccess | null;
  error: NextResponse | null;
}> {
  const { data, error } = await ctx.supabase
    .from("patients")
    .select("id,org_id,doctor_id")
    .eq("org_id", ctx.session.orgId)
    .eq("id", patientId)
    .maybeSingle();

  if (error) return { patient: null, access: null, error: dbError(error) };
  if (!data) return { patient: null, access: null, error: notFound("Paciente no encontrado") };

  const access = await patientAccess(ctx, data);
  if (!access.canViewClinical) {
    return {
      patient: null,
      access,
      error: forbidden("No tienes relación con la atención de este paciente"),
    };
  }

  return { patient: data, access, error: null };
}