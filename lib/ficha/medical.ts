import { z } from "zod";
import type { SectionDef } from "./dental";

export interface MedicalProfile {
  chronicDiseases: string;
  allergiesNotes: string;
  familyNotes: string;
  habitsNotes: string;
  pregnancies: string;
  notes: string;
}

export interface MedicalEncounterData {
  symptoms: string;
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
  treatmentFocus: string;
}

const numOrNull = z.number().min(0).max(9999).nullable().optional();

export const medicalProfileSchema = z.object({
  chronicDiseases: z.string().trim().max(4000).optional(),
  allergiesNotes: z.string().trim().max(2000).optional(),
  familyNotes: z.string().trim().max(4000).optional(),
  habitsNotes: z.string().trim().max(2000).optional(),
  pregnancies: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(4000).optional(),
}) as z.ZodType<MedicalProfile>;

export const medicalEncounterSchema = z.object({
  symptoms: z.string().trim().max(4000).optional(),
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
  treatmentFocus: z.string().trim().max(4000).optional(),
}) as z.ZodType<MedicalEncounterData>;

export const MEDICAL_FIELDS: SectionDef[] = [
  {
    id: "perfil",
    label: "Perfil médico",
    fields: [
      { key: "chronicDiseases", label: "Enfermedades crónicas", kind: "textarea", optional: true },
      { key: "allergiesNotes", label: "Alergias", kind: "textarea", optional: true },
      { key: "familyNotes", label: "Antecedentes familiares", kind: "textarea", optional: true },
      { key: "habitsNotes", label: "Hábitos", kind: "textarea", optional: true },
      { key: "pregnancies", label: "Gestas / embarazos", kind: "text", optional: true },
      { key: "notes", label: "Observaciones", kind: "textarea", optional: true },
    ],
  },
];

export const MEDICAL_ENCOUNTER_FIELDS: SectionDef[] = [
  {
    id: "registro",
    label: "Registro médico",
    fields: [
      { key: "symptoms", label: "Síntomas", kind: "textarea", optional: true },
      { key: "differentialDiagnosis", label: "Diagnóstico diferencial", kind: "textarea", optional: true },
      { key: "treatmentFocus", label: "Enfoque del tratamiento", kind: "textarea", optional: true },
    ],
  },
];