import { z } from "zod";

export const PERMANENT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const PERMANENT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;
export const DECIDUOUS_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65] as const;
export const DECIDUOUS_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] as const;

export const DENTITION_LABEL = {
  permanent: "Dientes permanentes",
  deciduous: "Dientes de leche",
} as const;

export const FACE_LABEL = {
  vestibular: "Vestibular",
  lingual: "Lingual",
  mesial: "Mesial",
  distal: "Distal",
  occlusal: "Oclusal",
  incisal: "Incisal",
} as const;

export const STATE_LABEL: Record<string, string> = {
  sana: "Sana",
  caries: "Caries",
  obturada: "Obturada",
  fractura: "Fractura",
  desgaste: "Desgaste",
  sellante: "Sellante",
  ausente: "Ausente",
  por_extraer: "Por extraer",
  extraida: "Extraída",
  endodoncia: "Endodoncia",
  corona: "Corona",
  puente: "Puente",
  implante: "Implante",
  protesis_removible: "Prótesis removible",
  incluida: "Incluida",
} as const;

export const STATE_ORDER: string[] = [
  "sana",
  "caries",
  "obturada",
  "endodoncia",
  "corona",
  "fractura",
  "desgaste",
  "sellante",
  "por_extraer",
  "extraida",
  "ausente",
  "puente",
  "implante",
  "protesis_removible",
  "incluida",
];

export const FACES: string[] = ["vestibular", "lingual", "mesial", "distal", "occlusal", "incisal"];

export function toothLabel(tooth: number): string {
  const set = tooth >= 11 && tooth <= 28 ? "superior" : "inferior";
  const dentition = tooth <= 48 ? "permanente" : "temporal";
  return `${tooth} (${dentition} ${set})`;
}

export function toothFaces(tooth: number): string[] {
  if (tooth >= 11 && tooth <= 48) return ["occlusal", "mesial", "distal", "vestibular", "lingual"];
  return ["incisal", "mesial", "distal", "vestibular", "lingual"];
}

export interface ToothStateSnapshot {
  tooth: number;
  faces: Record<string, string>;
}

export interface DentalProfile {
  motive: string;
  gumDisease: string;
  smilingHigh: boolean;
  notes: string;
  previousXrays: string;
}

export interface DentalEncounterData {
  chartEntries: ToothStateSnapshot[];
  observations: string;
  procedures: string[];
}

export const dentalProfileSchema = z.object({
  motive: z.string().trim().max(1000).optional(),
  gumDisease: z.string().trim().max(1000).optional(),
  smilingHigh: z.boolean().optional(),
  notes: z.string().trim().max(4000).optional(),
  previousXrays: z.string().trim().max(1000).optional(),
}) as z.ZodType<DentalProfile>;

export const dentalEncounterSchema = z.object({
  chartEntries: z
    .array(
      z.object({
        tooth: z.number().int(),
        faces: z.record(z.string(), z.string()),
      }),
    )
    .optional(),
  observations: z.string().trim().max(4000).optional(),
  procedures: z.array(z.string().max(160)).max(60).optional(),
}) as z.ZodType<DentalEncounterData>;

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  kind: "text" | "textarea" | "select" | "radio" | "date" | "checkbox";
  options?: FieldOption[];
  optional?: boolean;
}

export interface SectionDef {
  id: string;
  label: string;
  fields: FieldDef[];
}

export const DENTAL_FIELDS: SectionDef[] = [
  {
    id: "perfil",
    label: "Perfil odontológico",
    fields: [
      { key: "motive", label: "Motivo principal", kind: "text", optional: true },
      { key: "gumDisease", label: "Enfermedad de encías", kind: "text", optional: true },
      { key: "smilingHigh", label: "Sonrisa alta (muestra encía)", kind: "checkbox", optional: true },
      { key: "previousXrays", label: "Radiografías anteriores", kind: "text", optional: true },
      { key: "notes", label: "Observaciones", kind: "textarea", optional: true },
    ],
  },
];

export const DENTAL_ENCOUNTER_FIELDS: SectionDef[] = [
  {
    id: "registro",
    label: "Registro odontológico",
    fields: [
      { key: "observations", label: "Observaciones de la atención", kind: "textarea", optional: true },
      { key: "procedures", label: "Procedimientos", kind: "text", optional: true },
    ],
  },
];