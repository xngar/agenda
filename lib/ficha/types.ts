export type OrganizationType = "dental" | "medical" | "psychological";

export type DoctorRole = "professional" | "reception";

export type Sex = "female" | "male" | "other" | "undisclosed";

export type MaritalStatus = "single" | "married" | "widowed" | "divorced" | "other";

export type PrevisionType = "fonasa" | "isapre" | "particular" | "other";

export type FonasaTramo = "A" | "B" | "C" | "D";

export type PatientStatus = "active" | "inactive" | "abandoned";

export type EncounterStatus = "draft" | "signed";

export type AttachmentKind =
  | "document"
  | "radiografia"
  | "foto_intraoral"
  | "foto_extraoral"
  | "modelo"
  | "consentimiento"
  | "informe"
  | "other";

export type ConsentKind =
  | "datos_personales"
  | "tratamiento_dental"
  | "psicoterapia"
  | "atencion_online"
  | "other";

export type DentalDentition = "permanent" | "deciduous";

export type DentalFace =
  | "vestibular"
  | "lingual"
  | "mesial"
  | "distal"
  | "occlusal"
  | "incisal";

export type DentalState =
  | "sana"
  | "caries"
  | "obturada"
  | "fractura"
  | "desgaste"
  | "sellante"
  | "ausente"
  | "por_extraer"
  | "extraida"
  | "endodoncia"
  | "corona"
  | "puente"
  | "implante"
  | "protesis_removible"
  | "incluida";

export type TreatmentPlanStatus =
  | "pendiente"
  | "aceptado"
  | "en_curso"
  | "realizado"
  | "rechazado";

export type AuditAction = "insert" | "update" | "delete" | "sign" | "export" | "view";

export interface SpecialtyProfile {
  [key: string]: unknown;
}

export interface Patient {
  id: string;
  org_id: string;
  full_name: string;
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  rut: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  sex: Sex | null;
  nationality: string | null;
  marital_status: MaritalStatus | null;
  occupation: string | null;
  address: string | null;
  comuna: string | null;
  region: string | null;
  prevision_type: PrevisionType | null;
  fonasa_tramo: FonasaTramo | null;
  isapre_name: string | null;
  isapre_plan: string | null;
  emergency_name: string | null;
  emergency_relation: string | null;
  emergency_phone: string | null;
  tutor_name: string | null;
  tutor_rut: string | null;
  tutor_relation: string | null;
  tutor_phone: string | null;
  referral_source: string | null;
  patient_status: PatientStatus;
  admitted_at: string | null;
  specialty_profile: SpecialtyProfile;
  consent_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PatientContact = Pick<
  Patient,
  | "id"
  | "org_id"
  | "full_name"
  | "nombres"
  | "apellido_paterno"
  | "apellido_materno"
  | "rut"
  | "phone"
  | "email"
  | "birth_date"
  | "sex"
  | "address"
  | "comuna"
  | "region"
  | "consent_at"
  | "admitted_at"
  | "created_at"
>;

export interface PatientMedicalBackground {
  id: string;
  org_id: string;
  patient_id: string;
  motivo_consulta: string | null;
  antecedentes_medicos: string | null;
  medicamentos: Record<string, string>[];
  alergias: string[];
  antecedentes_familiares: string | null;
  habitos: Record<string, string | number | boolean>;
  embarazo_lactancia: boolean | null;
  updated_by: string | null;
  updated_at: string;
}

export interface Encounter {
  id: string;
  org_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  started_at: string;
  care_type: string | null;
  motivo: string | null;
  evolucion: string | null;
  diagnostico: string | null;
  indicaciones: string | null;
  proxima_cita_at: string | null;
  specialty_data: Record<string, unknown>;
  status: EncounterStatus;
  signed_by: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EncounterVersion {
  id: string;
  org_id: string;
  patient_id: string;
  encounter_id: string;
  author_id: string;
  reason: string;
  snapshot: Record<string, unknown>;
  created_at: string;
}

export interface Attachment {
  id: string;
  org_id: string;
  patient_id: string;
  encounter_id: string | null;
  kind: AttachmentKind;
  description: string | null;
  taken_at: string | null;
  storage_path: string;
  file_name: string | null;
  mime: string | null;
  size_bytes: number | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface Consent {
  id: string;
  org_id: string;
  patient_id: string;
  encounter_id: string | null;
  kind: ConsentKind;
  accepted_text: string;
  version: string;
  accepted_at: string;
  accepted_by_patient: boolean;
  signature_hash: string | null;
  signed_by: string | null;
}

export interface Prescription {
  id: string;
  org_id: string;
  patient_id: string;
  encounter_id: string | null;
  medication: string;
  dose: string;
  route: string | null;
  frequency: string | null;
  duration: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DentalChartEntry {
  id: string;
  org_id: string;
  patient_id: string;
  encounter_id: string | null;
  tooth: number;
  dentition: DentalDentition;
  face: DentalFace;
  state: DentalState;
  current: boolean;
  recorded_at: string;
  created_by: string | null;
  created_at: string;
}

export interface PeriodontalRecord {
  id: string;
  org_id: string;
  patient_id: string;
  encounter_id: string | null;
  tooth: number;
  depths: Record<string, number[]>;
  bleeding_on_probing: boolean | null;
  recession: number | null;
  mobility: number;
  furcation: string | null;
  diagnosis: string | null;
  recorded_at: string;
  created_by: string | null;
  created_at: string;
}

export interface DentalTreatmentPlanItem {
  id: string;
  org_id: string;
  patient_id: string;
  encounter_id: string | null;
  tooth: number | null;
  faces: string[] | null;
  treatment_id: string | null;
  description: string | null;
  priority: number | null;
  stage: string | null;
  value: number;
  status: TreatmentPlanStatus;
  approved: boolean;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DentalTreatmentCatalogItem {
  id: string;
  org_id: string;
  name: string;
  default_value: number;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  org_id: string | null;
  actor_id: string | null;
  action: AuditAction;
  entity: string;
  entity_id: string | null;
  summary: Record<string, unknown>;
  created_at: string;
}