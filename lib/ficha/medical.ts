import { z } from "zod";
import type { SectionDef } from "./dental";

export interface MedicalProfile {
  chronicDiseases: string;
  surgicalHistory: string;
  allergiesNotes: string;
  familyNotes: string;
  habitsNotes: string;
  pregnancies: string;
  vaccines: string;
  notes: string;
}

export interface MedicalEncounterData {
  symptoms: string;
  physicalExam: string;
  vitals: {
    temperatureC: number | null;
    systolicMmHg: number | null;
    diastolicMmHg: number | null;
    heartRateBpm: number | null;
    respiratoryRate: number | null;
    spo2: number | null;
    weightKg: number | null;
    heightCm: number | null;
  } | null;
  differentialDiagnosis: string;
  cie10: string;
  treatmentFocus: string;
  labOrders: string;
  sickLeaveFolio: string;
  sickLeaveDays: string;
  sickLeaveFrom: string;
  referral: string;
}

const numOrNull = z.number().min(0).max(9999).nullable().optional();

/** Código CIE-10 individual: letra + 2 dígitos, con sufijo opcional (p. ej. J06.9). Los rangos de capítulo (G00-G99) no son códigos y se rechazan. */
export const cie10Schema = z
  .string()
  .trim()
  .toUpperCase()
  .max(8)
  .refine((v) => v === "" || /^[A-TV-Z]\d{2}(\.\w{1,4})?$/.test(v), "Usa un código CIE-10 como J06.9 o F32 (los rangos como G00-G99 no son válidos)")
  .optional();

export const medicalProfileSchema = z.object({
  chronicDiseases: z.string().trim().max(4000).optional(),
  surgicalHistory: z.string().trim().max(4000).optional(),
  allergiesNotes: z.string().trim().max(2000).optional(),
  familyNotes: z.string().trim().max(4000).optional(),
  habitsNotes: z.string().trim().max(2000).optional(),
  pregnancies: z.string().trim().max(1000).optional(),
  vaccines: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(4000).optional(),
}) as z.ZodType<MedicalProfile>;

export const medicalEncounterSchema = z.object({
  symptoms: z.string().trim().max(4000).optional(),
  physicalExam: z.string().trim().max(4000).optional(),
  vitals: z
    .object({
      temperatureC: numOrNull,
      systolicMmHg: numOrNull,
      diastolicMmHg: numOrNull,
      heartRateBpm: numOrNull,
      respiratoryRate: numOrNull,
      spo2: numOrNull,
      weightKg: numOrNull,
      heightCm: numOrNull,
    })
    .nullable()
    .optional(),
  differentialDiagnosis: z.string().trim().max(4000).optional(),
  cie10: cie10Schema,
  treatmentFocus: z.string().trim().max(4000).optional(),
  labOrders: z.string().trim().max(4000).optional(),
  sickLeaveFolio: z.string().trim().max(40).optional(),
  sickLeaveDays: z.string().trim().max(10).optional(),
  sickLeaveFrom: z.string().trim().max(10).optional(),
  referral: z.string().trim().max(4000).optional(),
}) as z.ZodType<MedicalEncounterData>;

/** IMC derivado de peso y talla; null si faltan datos. No se almacena. */
export function calcularIMC(weightKg: unknown, heightCm: unknown): number | null {
  if (typeof weightKg !== "number" || typeof heightCm !== "number") return null;
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) {
    return null;
  }
  const tallaM = heightCm / 100;
  return Math.round((weightKg / (tallaM * tallaM)) * 10) / 10;
}

export function etiquetaIMC(imc: number): string {
  if (imc < 18.5) return "Bajo peso";
  if (imc < 25) return "Normal";
  if (imc < 30) return "Sobrepeso";
  return "Obesidad";
}

export const MEDICAL_FIELDS: SectionDef[] = [
  {
    id: "perfil",
    label: "Perfil médico",
    fields: [
      { key: "chronicDiseases", label: "Enfermedades crónicas", kind: "textarea", optional: true },
      { key: "surgicalHistory", label: "Antecedentes quirúrgicos", kind: "textarea", optional: true },
      { key: "allergiesNotes", label: "Alergias", kind: "textarea", optional: true },
      { key: "familyNotes", label: "Antecedentes familiares", kind: "textarea", optional: true },
      { key: "habitsNotes", label: "Hábitos (tabaco, alcohol, actividad física)", kind: "textarea", optional: true },
      { key: "pregnancies", label: "Gestas / embarazos", kind: "text", optional: true },
      { key: "vaccines", label: "Vacunas", kind: "textarea", optional: true },
      { key: "notes", label: "Observaciones", kind: "textarea", optional: true },
    ],
  },
];

export const MEDICAL_ENCOUNTER_FIELDS: SectionDef[] = [
  {
    id: "registro",
    label: "Registro médico",
    fields: [
      { key: "symptoms", label: "Síntomas (anamnesis)", kind: "textarea", optional: true },
      { key: "physicalExam", label: "Examen físico", kind: "textarea", optional: true },
      { key: "differentialDiagnosis", label: "Diagnóstico diferencial", kind: "textarea", optional: true },
      {
        key: "cie10",
        label: "Código CIE-10",
        kind: "text",
        optional: true,
        placeholder: "J06.9",
        hint: "Un código por atención (p. ej. J06.9, F32). Los rangos como G00-G99 van en el Diagnóstico, no acá.",
      },
      { key: "treatmentFocus", label: "Enfoque del tratamiento", kind: "textarea", optional: true },
    ],
  },
  {
    id: "documentos",
    label: "Órdenes, licencias y derivaciones",
    fields: [
      { key: "labOrders", label: "Órdenes de exámenes", kind: "textarea", optional: true },
      { key: "referral", label: "Derivación", kind: "textarea", optional: true },
      { key: "sickLeaveFolio", label: "Licencia: folio", kind: "text", optional: true },
      { key: "sickLeaveDays", label: "Licencia: días", kind: "text", optional: true },
      { key: "sickLeaveFrom", label: "Licencia: desde", kind: "date", optional: true },
    ],
  },
];