import { z } from "zod";
import type { SectionDef } from "./dental";

export interface PsychologicalProfile {
  reasonBackground: string;
  previousTherapy: string;
  familySupport: string;
  psychiatristCare: string;
  riskFactors: string;
  notes: string;
}

export interface PsychologicalEncounterData {
  sessionType: string;
  currentState: string;
  riskAssessment: string;
  mhGapSection: string;
  safetyConcerns: boolean | null;
  observations: string;
  privateNotes: string;
}

export const psychologicalProfileSchema = z.object({
  reasonBackground: z.string().trim().max(4000).optional(),
  previousTherapy: z.string().trim().max(2000).optional(),
  familySupport: z.string().trim().max(2000).optional(),
  psychiatristCare: z.string().trim().max(2000).optional(),
  riskFactors: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(4000).optional(),
}) as z.ZodType<PsychologicalProfile>;

export const psychologicalEncounterSchema = z.object({
  sessionType: z.string().trim().max(200).optional(),
  currentState: z.string().trim().max(4000).optional(),
  riskAssessment: z.string().trim().max(4000).optional(),
  mhGapSection: z.string().trim().max(4000).optional(),
  safetyConcerns: z.boolean().nullable().optional(),
  observations: z.string().trim().max(8000).optional(),
  privateNotes: z.string().trim().max(8000).optional(),
}) as z.ZodType<PsychologicalEncounterData>;

export const PSYCHOLOGICAL_FIELDS: SectionDef[] = [
  {
    id: "perfil",
    label: "Perfil psicológico",
    fields: [
      { key: "reasonBackground", label: "Motivo de consulta (antecedentes)", kind: "textarea", optional: true },
      { key: "previousTherapy", label: "Terapia previa", kind: "textarea", optional: true },
      { key: "familySupport", label: "Apoyo familiar", kind: "textarea", optional: true },
      { key: "psychiatristCare", label: "Atención psiquiátrica", kind: "textarea", optional: true },
      { key: "riskFactors", label: "Factores de riesgo", kind: "textarea", optional: true },
      { key: "notes", label: "Observaciones", kind: "textarea", optional: true },
    ],
  },
];

export const PSYCHOLOGICAL_ENCOUNTER_FIELDS: SectionDef[] = [
  {
    id: "registro",
    label: "Registro psicológico",
    fields: [
      { key: "sessionType", label: "Tipo de sesión", kind: "text", optional: true },
      { key: "currentState", label: "Estado actual", kind: "textarea", optional: true },
      { key: "riskAssessment", label: "Evaluación de riesgo", kind: "textarea", optional: true },
      { key: "mhGapSection", label: "Sección mhGAP", kind: "textarea", optional: true },
      { key: "safetyConcerns", label: "Preocupaciones de seguridad", kind: "checkbox", optional: true },
      { key: "observations", label: "Observaciones", kind: "textarea", optional: true },
    ],
  },
];