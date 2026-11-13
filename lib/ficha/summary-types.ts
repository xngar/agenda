export type PatientSummaryScope = "clinical" | "administrative";

export interface PatientSummaryPatient {
  id: string;
  full_name: string;
  rut: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  sex: string | null;
  patient_status: string;
  prevision_type: string | null;
  fonasa_tramo: string | null;
  isapre_name: string | null;
  isapre_plan: string | null;
  address: string | null;
  comuna: string | null;
  emergency_name: string | null;
  emergency_relation: string | null;
  emergency_phone: string | null;
  tutor_name: string | null;
  tutor_relation: string | null;
  tutor_phone: string | null;
  admitted_at: string | null;
  doctor_name: string | null;
  treatment_alerts: string | null;
}

export interface PatientSummaryMedication {
  nombre: string;
  detalle?: string;
}

export interface PatientSummaryBackground {
  motivo_consulta: string | null;
  antecedentes_medicos: string | null;
  alergias: string[];
  medicamentos: PatientSummaryMedication[];
  antecedentes_familiares: string | null;
  habitos: Record<string, string | number | boolean>;
  embarazo_lactancia: boolean | null;
  updated_at: string | null;
}

export interface PatientSummaryEncounter {
  id: string;
  started_at: string;
  care_type: string | null;
  motivo: string | null;
  diagnostico: string | null;
  indicaciones: string | null;
  proxima_cita_at: string | null;
  status: "draft" | "signed";
  doctor_name: string | null;
}

export interface PatientSummary {
  scope: PatientSummaryScope;
  patient: PatientSummaryPatient;
  background: PatientSummaryBackground | null;
  last_encounter: PatientSummaryEncounter | null;
}
