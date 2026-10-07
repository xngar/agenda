import type { z } from "zod";
import type { OrganizationType } from "./types";
import {
  dentalProfileSchema,
  dentalEncounterSchema,
  DENTAL_FIELDS,
  DENTAL_ENCOUNTER_FIELDS,
  type SectionDef,
} from "./dental";
import {
  medicalProfileSchema,
  medicalEncounterSchema,
  MEDICAL_FIELDS,
  MEDICAL_ENCOUNTER_FIELDS,
} from "./medical";
import {
  psychologicalProfileSchema,
  psychologicalEncounterSchema,
  PSYCHOLOGICAL_FIELDS,
  PSYCHOLOGICAL_ENCOUNTER_FIELDS,
} from "./psychological";

export interface FichaDefinition {
  label: string;
  schemaVersion: string;
  profileSchema: z.ZodType<Record<string, unknown>>;
  encounterSchema: z.ZodType<Record<string, unknown>>;
  profileFields: SectionDef[];
  encounterFields: SectionDef[];
}

export const FICHA_BY_TYPE: Record<OrganizationType, FichaDefinition> = {
  dental: {
    label: "Odontológica",
    schemaVersion: "1",
    profileSchema: dentalProfileSchema as unknown as z.ZodType<Record<string, unknown>>,
    encounterSchema: dentalEncounterSchema as unknown as z.ZodType<Record<string, unknown>>,
    profileFields: DENTAL_FIELDS,
    encounterFields: DENTAL_ENCOUNTER_FIELDS,
  },
  medical: {
    label: "Médica",
    schemaVersion: "1",
    profileSchema: medicalProfileSchema as unknown as z.ZodType<Record<string, unknown>>,
    encounterSchema: medicalEncounterSchema as unknown as z.ZodType<Record<string, unknown>>,
    profileFields: MEDICAL_FIELDS,
    encounterFields: MEDICAL_ENCOUNTER_FIELDS,
  },
  psychological: {
    label: "Psicológica",
    schemaVersion: "1",
    profileSchema: psychologicalProfileSchema as unknown as z.ZodType<Record<string, unknown>>,
    encounterSchema: psychologicalEncounterSchema as unknown as z.ZodType<Record<string, unknown>>,
    profileFields: PSYCHOLOGICAL_FIELDS,
    encounterFields: PSYCHOLOGICAL_ENCOUNTER_FIELDS,
  },
};

export const ORG_TYPE_LABEL: Record<OrganizationType, string> = {
  dental: "Odontológica",
  medical: "Médica",
  psychological: "Psicológica",
};

export function fichaFor(type: OrganizationType): FichaDefinition {
  return FICHA_BY_TYPE[type];
}