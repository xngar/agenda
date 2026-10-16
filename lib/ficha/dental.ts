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

/**
 * Prioridad para el color agregado de una pieza: gana el estado que más
 * atención clínica pide. Antes sólo se pintaban extraída/ausente/caries y
 * todo lo demás (obturada, corona, endodoncia…) quedaba gris como si no
 * tuviera nada, aunque el dato sí estaba guardado.
 */
export const TOOTH_STATE_PRIORITY: string[] = [
  "extraida",
  "ausente",
  "caries",
  "por_extraer",
  "endodoncia",
  "fractura",
  "obturada",
  "corona",
  "puente",
  "implante",
  "sellante",
  "desgaste",
  "incluida",
  "protesis_removible",
  "sana",
];

/**
 * Estado agregado de una pieza a partir de los estados de sus caras (una
 * entrada por cara; las no registradas van como undefined/null/"").
 * "sana" sólo si todas las caras vienen registradas y sanas; undefined si
 * no hay ninguna cara registrada.
 */
export function aggregateToothState(states: (string | undefined | null)[]): string | undefined {
  const presentes = states.filter((s): s is string => typeof s === "string" && s !== "");
  if (presentes.length === 0) return undefined;
  const todasRegistradas = states.every((s): s is string => typeof s === "string" && s !== "");
  if (todasRegistradas && presentes.every((s) => s === "sana")) return "sana";
  for (const candidato of TOOTH_STATE_PRIORITY) {
    if (candidato === "sana") continue;
    if (presentes.includes(candidato)) return candidato;
  }
  return undefined;
}

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
  lastVisit: string;
  hygiene: string;
  treatmentAlerts: string;
}

export interface DentalEncounterData {
  chartEntries: ToothStateSnapshot[];
  observations: string;
  procedures: string[];
  orthodontics: string;
}

export const dentalProfileSchema = z.object({
  motive: z.string().trim().max(1000).optional(),
  gumDisease: z.string().trim().max(1000).optional(),
  smilingHigh: z.boolean().optional(),
  notes: z.string().trim().max(4000).optional(),
  previousXrays: z.string().trim().max(1000).optional(),
  lastVisit: z.string().trim().max(10).optional(),
  hygiene: z.string().trim().max(2000).optional(),
  treatmentAlerts: z.string().trim().max(4000).optional(),
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
  procedures: z
    .preprocess(
      (v) => (typeof v === "string" ? v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) : v),
      z.array(z.string().max(160)).max(60),
    )
    .optional(),
  orthodontics: z.string().trim().max(4000).optional(),
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
  placeholder?: string;
  hint?: string;
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
      { key: "lastVisit", label: "Última visita al dentista", kind: "date", optional: true },
      { key: "notes", label: "Observaciones", kind: "textarea", optional: true },
    ],
  },
  {
    id: "higiene",
    label: "Higiene y alertas",
    fields: [
      { key: "hygiene", label: "Higiene (cepillado, hilo, frecuencia)", kind: "textarea", optional: true },
      { key: "treatmentAlerts", label: "Alertas para el tratamiento (anticoagulantes, diabetes, embarazo, anestesia, látex)", kind: "textarea", optional: true },
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
      { key: "orthodontics", label: "Ortodoncia (aparato, instalación, controles)", kind: "textarea", optional: true },
    ],
  },
];