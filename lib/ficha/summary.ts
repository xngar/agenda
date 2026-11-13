import "server-only";

import type { NextResponse } from "next/server";
import type { FichaContext } from "./http";
import { auditPatientView, dbError, notFound, orgPatient } from "./http";
import type {
  PatientSummary,
  PatientSummaryBackground,
  PatientSummaryEncounter,
  PatientSummaryMedication,
  PatientSummaryPatient,
} from "./summary-types";

type Row = Record<string, unknown>;

const ADMIN_PATIENT_SELECT =
  "id,full_name,rut,phone,email,birth_date,sex,patient_status,prevision_type,fonasa_tramo,isapre_name,isapre_plan,address,comuna,emergency_name,emergency_relation,emergency_phone,tutor_name,tutor_relation,tutor_phone,admitted_at,doctor_id,doctors!patients_doctor_id_fkey (full_name)";

const CLINICAL_PATIENT_SELECT = `${ADMIN_PATIENT_SELECT},specialty_profile`;

const BACKGROUND_SELECT =
  "motivo_consulta,antecedentes_medicos,alergias,medicamentos,antecedentes_familiares,habitos,embarazo_lactancia,updated_at";

const ENCOUNTER_SELECT =
  "id,started_at,care_type,motivo,diagnostico,indicaciones,proxima_cita_at,status,doctor_id,doctors!encounters_doctor_id_fkey (full_name)";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function relationName(value: unknown): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const name = (row as Row).full_name;
  return typeof name === "string" && name.trim() !== "" ? name : null;
}

function treatmentAlerts(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const alertas = (value as Row).treatmentAlerts;
  return typeof alertas === "string" && alertas.trim() !== "" ? alertas.trim() : null;
}

function allergies(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function medications(value: unknown): PatientSummaryMedication[] {
  if (!Array.isArray(value)) return [];
  const lista: PatientSummaryMedication[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Row;
    const nombre = typeof row.nombre === "string" ? row.nombre.trim() : "";
    if (!nombre) continue;
    const detalle = typeof row.detalle === "string" ? row.detalle.trim() : "";
    lista.push(detalle ? { nombre, detalle } : { nombre });
  }
  return lista;
}

function habits(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const salida: Record<string, string | number | boolean> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      salida[key] = item;
    }
  }
  return salida;
}

function summaryPatient(row: Row, alertas: string | null): PatientSummaryPatient {
  return {
    id: String(row.id),
    full_name: text(row.full_name) ?? "Paciente",
    rut: text(row.rut),
    phone: text(row.phone),
    email: text(row.email),
    birth_date: text(row.birth_date),
    sex: text(row.sex),
    patient_status: typeof row.patient_status === "string" ? row.patient_status : "active",
    prevision_type: text(row.prevision_type),
    fonasa_tramo: text(row.fonasa_tramo),
    isapre_name: text(row.isapre_name),
    isapre_plan: text(row.isapre_plan),
    address: text(row.address),
    comuna: text(row.comuna),
    emergency_name: text(row.emergency_name),
    emergency_relation: text(row.emergency_relation),
    emergency_phone: text(row.emergency_phone),
    tutor_name: text(row.tutor_name),
    tutor_relation: text(row.tutor_relation),
    tutor_phone: text(row.tutor_phone),
    admitted_at: text(row.admitted_at),
    doctor_name: relationName(row.doctors),
    treatment_alerts: alertas,
  };
}

function summaryBackground(row: Row): PatientSummaryBackground {
  return {
    motivo_consulta: text(row.motivo_consulta),
    antecedentes_medicos: text(row.antecedentes_medicos),
    alergias: allergies(row.alergias),
    medicamentos: medications(row.medicamentos),
    antecedentes_familiares: text(row.antecedentes_familiares),
    habitos: habits(row.habitos),
    embarazo_lactancia:
      typeof row.embarazo_lactancia === "boolean" ? row.embarazo_lactancia : null,
    updated_at: text(row.updated_at),
  };
}

function summaryEncounter(row: Row): PatientSummaryEncounter {
  return {
    id: String(row.id),
    started_at: text(row.started_at) ?? "",
    care_type: text(row.care_type),
    motivo: text(row.motivo),
    diagnostico: text(row.diagnostico),
    indicaciones: text(row.indicaciones),
    proxima_cita_at: text(row.proxima_cita_at),
    status: row.status === "signed" ? "signed" : "draft",
    doctor_name: relationName(row.doctors),
  };
}

/**
 * Resumen para el perfil rápido de la agenda.
 *
 * La recepción recibe sólo datos administrativos, sin consultar ni auditar
 * tablas clínicas. El equipo clínico pasa por `orgPatient` (vínculo
 * asistencial) y cada lectura clínica queda auditada igual que en la ficha.
 */
export async function patientSummary(
  ctx: FichaContext,
  patientId: string,
): Promise<{ summary: PatientSummary | null; error: NextResponse | null }> {
  if (ctx.session.role === "reception" && !ctx.clinical) {
    const { data, error } = await ctx.supabase
      .from("patients")
      .select(ADMIN_PATIENT_SELECT)
      .eq("org_id", ctx.session.orgId)
      .eq("id", patientId)
      .maybeSingle();

    if (error) return { summary: null, error: dbError(error) };
    if (!data) return { summary: null, error: notFound("Paciente no encontrado") };

    return {
      summary: {
        scope: "administrative",
        patient: summaryPatient(data as Row, null),
        background: null,
        last_encounter: null,
      },
      error: null,
    };
  }

  const { error: accessError } = await orgPatient(ctx, patientId);
  if (accessError) return { summary: null, error: accessError };

  const [patientRes, backgroundRes, encounterRes] = await Promise.all([
    ctx.supabase
      .from("patients")
      .select(CLINICAL_PATIENT_SELECT)
      .eq("org_id", ctx.session.orgId)
      .eq("id", patientId)
      .maybeSingle(),
    ctx.supabase
      .from("patient_medical_background")
      .select(BACKGROUND_SELECT)
      .eq("org_id", ctx.session.orgId)
      .eq("patient_id", patientId)
      .maybeSingle(),
    ctx.supabase
      .from("encounters")
      .select(ENCOUNTER_SELECT)
      .eq("org_id", ctx.session.orgId)
      .eq("patient_id", patientId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (patientRes.error) return { summary: null, error: dbError(patientRes.error) };
  if (!patientRes.data) return { summary: null, error: notFound("Paciente no encontrado") };
  if (backgroundRes.error) return { summary: null, error: dbError(backgroundRes.error) };
  if (encounterRes.error) return { summary: null, error: dbError(encounterRes.error) };

  const patientRow = patientRes.data as Row;
  const backgroundRow = (backgroundRes.data as Row | null) ?? null;
  const encounterRow = (encounterRes.data as Row | null) ?? null;

  const audits = await Promise.all([
    auditPatientView(ctx, patientId, "patients"),
    auditPatientView(ctx, patientId, "patient_background"),
    encounterRow ? auditPatientView(ctx, patientId, "encounters") : Promise.resolve(null),
  ]);
  const auditError = audits.find((item): item is NextResponse => item !== null);
  if (auditError) return { summary: null, error: auditError };

  return {
    summary: {
      scope: "clinical",
      patient: summaryPatient(patientRow, treatmentAlerts(patientRow.specialty_profile)),
      background: backgroundRow ? summaryBackground(backgroundRow) : null,
      last_encounter: encounterRow ? summaryEncounter(encounterRow) : null,
    },
    error: null,
  };
}
