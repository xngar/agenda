import { z } from "zod";
import type { SectionDef } from "./dental";

export interface PsychologicalProfile {
  reasonBackground: string;
  previousTherapy: string;
  familySupport: string;
  psychiatristCare: string;
  riskFactors: string;
  therapeuticApproach: string;
  therapyGoals: string;
  sessionFrequency: string;
  notes: string;
}

export interface PsychologicalEncounterData {
  sessionType: string;
  modality: string;
  attendance: string;
  durationMinutes: number | null;
  currentState: string;
  riskAssessment: string;
  riskResponse: string;
  mhGapSection: string;
  safetyConcerns: boolean | null;
  phq9: number | null;
  gad7: number | null;
  dsm5: string;
  interventions: string;
  response: string;
  goalsProgress: string;
  nextSteps: string;
  observations: string;
  privateNotes: string;
}

const escala = (max: number) =>
  z.coerce.number().min(0).max(max).nullable().optional();

export const psychologicalProfileSchema = z.object({
  reasonBackground: z.string().trim().max(4000).optional(),
  previousTherapy: z.string().trim().max(2000).optional(),
  familySupport: z.string().trim().max(2000).optional(),
  psychiatristCare: z.string().trim().max(2000).optional(),
  riskFactors: z.string().trim().max(2000).optional(),
  therapeuticApproach: z.string().trim().max(2000).optional(),
  therapyGoals: z.string().trim().max(4000).optional(),
  sessionFrequency: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(4000).optional(),
}) as z.ZodType<PsychologicalProfile>;

export const psychologicalEncounterSchema = z.object({
  sessionType: z.string().trim().max(200).optional(),
  modality: z.enum(["presencial", "online"]).nullable().optional(),
  attendance: z.enum(["attended", "late", "no_show", "rescheduled"]).nullable().optional(),
  durationMinutes: z.number().int().min(1).max(240).nullable().optional(),
  currentState: z.string().trim().max(4000).optional(),
  riskAssessment: z.string().trim().max(4000).optional(),
  riskResponse: z.string().trim().max(4000).optional(),
  mhGapSection: z.string().trim().max(4000).optional(),
  safetyConcerns: z.boolean().nullable().optional(),
  phq9: escala(27),
  gad7: escala(21),
  dsm5: z.string().trim().max(1000).optional(),
  interventions: z.string().trim().max(8000).optional(),
  response: z.string().trim().max(8000).optional(),
  goalsProgress: z.string().trim().max(4000).optional(),
  nextSteps: z.string().trim().max(4000).optional(),
  observations: z.string().trim().max(8000).optional(),
  privateNotes: z.string().trim().max(8000).optional(),
}) as z.ZodType<PsychologicalEncounterData>;

function rango(valor: unknown, cortes: [number, string][]): string | null {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return null;
  for (const [corte, etiqueta] of cortes) {
    if (valor <= corte) return etiqueta;
  }
  return null;
}

/** Interpretación estándar del PHQ-9 (0–27). */
export function interpretarPHQ9(valor: unknown): string | null {
  return rango(valor, [
    [4, "Mínima"],
    [9, "Leve"],
    [14, "Moderada"],
    [19, "Moderada-grave"],
    [27, "Grave"],
  ]);
}

/** Interpretación estándar del GAD-7 (0–21). */
export function interpretarGAD7(valor: unknown): string | null {
  return rango(valor, [
    [4, "Mínima"],
    [9, "Leve"],
    [14, "Moderada"],
    [21, "Grave"],
  ]);
}

export const PSYCHOLOGICAL_FIELDS: SectionDef[] = [
  {
    id: "perfil",
    label: "Perfil psicológico",
    fields: [
      { key: "reasonBackground", label: "Motivo de consulta y expectativas", kind: "textarea", optional: true },
      { key: "previousTherapy", label: "Terapia previa", kind: "textarea", optional: true },
      { key: "familySupport", label: "Historia personal y red de apoyo", kind: "textarea", optional: true },
      { key: "psychiatristCare", label: "Atención psiquiátrica y medicación", kind: "textarea", optional: true },
      { key: "riskFactors", label: "Factores de riesgo", kind: "textarea", optional: true },
      { key: "notes", label: "Observaciones", kind: "textarea", optional: true },
    ],
  },
  {
    id: "plan",
    label: "Plan terapéutico",
    fields: [
      { key: "therapeuticApproach", label: "Enfoque", kind: "text", optional: true },
      { key: "therapyGoals", label: "Objetivos", kind: "textarea", optional: true },
      { key: "sessionFrequency", label: "Frecuencia de sesiones", kind: "text", optional: true },
    ],
  },
];

export const PSYCHOLOGICAL_ENCOUNTER_FIELDS: SectionDef[] = [
  {
    id: "registro",
    label: "Registro psicológico",
    fields: [
      { key: "sessionType", label: "Tipo de sesión", kind: "text", optional: true },
      {
        key: "modality",
        label: "Modalidad",
        kind: "select",
        options: [
          { value: "presencial", label: "Presencial" },
          { value: "online", label: "Online" },
        ],
        optional: true,
      },
      {
        key: "attendance",
        label: "Asistencia",
        kind: "select",
        options: [
          { value: "attended", label: "Asistió" },
          { value: "late", label: "Asistió con atraso" },
          { value: "no_show", label: "No asistió" },
          { value: "rescheduled", label: "Reagendada" },
        ],
        optional: true,
      },
      { key: "durationMinutes", label: "Duración (minutos)", kind: "number", optional: true },
      { key: "currentState", label: "Estado actual", kind: "textarea", optional: true },
      { key: "riskAssessment", label: "Evaluación de riesgo", kind: "textarea", optional: true },
      { key: "riskResponse", label: "Acciones y seguimiento acordados ante el riesgo", kind: "textarea", optional: true },
      { key: "mhGapSection", label: "Sección mhGAP", kind: "textarea", optional: true },
      { key: "safetyConcerns", label: "Preocupaciones de seguridad", kind: "checkbox", optional: true },
      { key: "interventions", label: "Intervenciones realizadas", kind: "textarea", optional: true },
      { key: "response", label: "Respuesta del paciente", kind: "textarea", optional: true },
      { key: "goalsProgress", label: "Avance de objetivos terapéuticos", kind: "textarea", optional: true },
      { key: "nextSteps", label: "Plan y próximos pasos", kind: "textarea", optional: true },
      { key: "observations", label: "Observaciones", kind: "textarea", optional: true },
    ],
  },
  {
    id: "diagnostico",
    label: "Hipótesis y escalas",
    fields: [
      { key: "dsm5", label: "Hipótesis / DSM-5 / CIE-10", kind: "text", optional: true },
      { key: "phq9", label: "PHQ-9 (0–27)", kind: "text", optional: true },
      { key: "gad7", label: "GAD-7 (0–21)", kind: "text", optional: true },
    ],
  },
];