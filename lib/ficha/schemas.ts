import { z } from "zod";
import { isValidRut } from "../rut";
import { emailSchema, phoneSchema, uuidSchema } from "../validation";

const optText = (min: number, max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message ?? `Demasiado largo (máx. ${max} caracteres)`)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined))
    .nullish();

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Ingresa el nombre completo")
  .max(120, "El nombre es demasiado largo");

export const fichaRutSchema = z
  .string()
  .trim()
  .max(16, "El RUT es demasiado largo")
  .refine((v) => v === "" || isValidRut(v), "El dígito verificador no coincide");

export const patientBaseSchema = z.object({
  nombres: z.string().trim().max(80, "Los nombres son demasiado largos").nullable().optional(),
  apellido_paterno: z.string().trim().max(60).nullable().optional(),
  apellido_materno: z.string().trim().max(60).nullable().optional(),
  full_name: z.string().trim().min(2).max(120).optional(),
  rut: fichaRutSchema.nullable().optional(),
  birth_date: dateStringSchema.nullable().optional(),
  sex: z.enum(["female", "male", "other", "undisclosed"]).nullable().optional(),
  nationality: z.string().trim().max(80).nullable().optional(),
  marital_status: z.enum(["single", "married", "widowed", "divorced", "other"]).nullable().optional(),
  occupation: z.string().trim().max(120).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  comuna: z.string().trim().max(80).nullable().optional(),
  region: z.string().trim().max(80).nullable().optional(),
  prevision_type: z.enum(["fonasa", "isapre", "particular", "other"]).nullable().optional(),
  fonasa_tramo: z.enum(["A", "B", "C", "D"]).nullable().optional(),
  isapre_name: z.string().trim().max(120).nullable().optional(),
  isapre_plan: z.string().trim().max(120).nullable().optional(),
  emergency_name: z.string().trim().max(120).nullable().optional(),
  emergency_relation: z.string().trim().max(60).nullable().optional(),
  emergency_phone: phoneSchema.or(z.literal("")).nullable().optional(),
  tutor_name: z.string().trim().max(120).nullable().optional(),
  tutor_rut: fichaRutSchema.nullable().optional(),
  tutor_relation: z.string().trim().max(60).nullable().optional(),
  tutor_phone: phoneSchema.or(z.literal("")).nullable().optional(),
  referral_source: z.string().trim().max(200).nullable().optional(),
  patient_status: z.enum(["active", "inactive", "abandoned"]).optional(),
  admitted_at: dateStringSchema.nullable().optional(),
  phone: phoneSchema.or(z.literal("")).nullable().optional(),
  email: emailSchema.or(z.literal("")).nullable().optional(),
  specialty_profile: z.record(z.string(), z.unknown()).optional(),
});

export type PatientBaseInput = z.infer<typeof patientBaseSchema>;

export const patientBasicsSchema = z.object({
  full_name: fullNameSchema,
  rut: fichaRutSchema,
  phone: phoneSchema.or(z.literal("")).optional(),
  email: emailSchema.or(z.literal("")).nullable().optional(),
});

export const backgroundSchema = z.object({
  motivo_consulta: optText(0, 2000, "El motivo es demasiado largo"),
  antecedentes_medicos: optText(0, 4000),
  medicamentos: z
    .array(z.object({ nombre: z.string().trim().max(120), detalle: z.string().trim().max(300).optional() }))
    .max(50, "Demasiados medicamentos"),
  alergias: z.array(z.string().trim().min(1).max(120)).max(30, "Demasiadas alergias"),
  antecedentes_familiares: optText(0, 4000),
  habitos: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  embarazo_lactancia: z.boolean().nullable().optional(),
  patient_id: uuidSchema,
});

export const encounterSchema = z.object({
  patient_id: uuidSchema,
  appointment_id: uuidSchema.nullable().optional(),
  started_at: dateStringSchema.optional(),
  care_type: z.string().trim().max(120).nullable().optional(),
  motivo: optText(0, 2000),
  evolucion: optText(0, 8000),
  diagnostico: optText(0, 4000),
  indicaciones: optText(0, 4000),
  proxima_cita_at: dateStringSchema.nullable().optional(),
  specialty_data: z.record(z.string(), z.unknown()).optional(),
});

export const signEncounterSchema = z.object({
  id: uuidSchema,
});

export const versionSchema = z.object({
  reason: z.string().trim().min(3, "Indica el motivo de la corrección").max(400),
});

export const consentAcceptanceSchema = z.object({
  encounter_id: uuidSchema.nullable().optional(),
  kind: z.enum([
    "datos_personales",
    "tratamiento_dental",
    "psicoterapia",
    "atencion_online",
    "medical_procedure",
    "medical_treatment",
    "medical_anesthesia",
    "other",
  ]),
  outcome: z.enum(["accepted", "rejected"]).default("accepted"),
  accepted_text: z.string().trim().max(8000).optional(),
  procedure: z.string().trim().min(2).max(300).optional(),
  purpose: z.string().trim().min(2).max(2000).optional(),
  benefits: z.string().trim().min(2).max(2000).optional(),
  risks: z.string().trim().min(2).max(3000).optional(),
  alternatives: z.string().trim().min(2).max(2000).optional(),
  refusal_consequences: z.string().trim().min(2).max(2000).optional(),
  version: z.string().trim().max(20).optional(),
  accepted_by_patient: z.boolean(),
  accepted_by_name: z.string().trim().min(2, "Ingresa el nombre de quien aceptó").max(120),
  accepted_by_relation: z.string().trim().max(100).nullable().optional(),
  acceptance_method: z.enum(["verbal", "documento"]),
  acceptance_channel: z.enum([
    "presencial",
    "videollamada",
    "llamada_telefonica",
    "correo_electronico",
    "plataforma_digital",
  ]),
  evidence_attachment_id: uuidSchema.nullable().optional(),
  decisionConfirmed: z.literal(true, {
    error: "Confirma que registras fielmente la decisión informada",
  }),
}).superRefine((data, context) => {
  const isMedicalConsent = data.kind.startsWith("medical_");
  if (isMedicalConsent) {
    for (const field of ["procedure", "purpose", "benefits", "risks", "alternatives", "refusal_consequences"] as const) {
      if (!data[field]?.trim()) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Completa este campo; si no aplica, indícalo expresamente.",
        });
      }
    }
  } else if (!data.accepted_text || data.accepted_text.trim().length < 20) {
    context.addIssue({
      code: "custom",
      path: ["accepted_text"],
      message: "El texto del consentimiento debe tener al menos 20 caracteres.",
    });
  }
  if (!data.accepted_by_patient && !data.accepted_by_relation?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["accepted_by_relation"],
      message: "Indica el vínculo de la persona que aceptó en representación del paciente.",
    });
  }
  if (data.acceptance_method === "documento" && !data.evidence_attachment_id) {
    context.addIssue({
      code: "custom",
      path: ["evidence_attachment_id"],
      message: "Adjunta el documento firmado antes de registrar este método.",
    });
  }
});

export const consentSchema = consentAcceptanceSchema.extend({ patient_id: uuidSchema });

export const prescriptionSchema = z.object({
  patient_id: uuidSchema,
  encounter_id: uuidSchema.nullable().optional(),
  medication: z.string().trim().min(2, "Ingresa el medicamento").max(160),
  dose: z.string().trim().min(1, "Ingresa la dosis").max(80),
  route: z.string().trim().max(60).nullable().optional(),
  frequency: z.string().trim().max(120).nullable().optional(),
  duration: z.string().trim().max(120).nullable().optional(),
});

export const attachmentSchema = z.object({
  patient_id: uuidSchema,
  encounter_id: uuidSchema.nullable().optional(),
  kind: z.enum([
    "document",
    "radiografia",
    "foto_intraoral",
    "foto_extraoral",
    "modelo",
    "consentimiento",
    "informe",
    "other",
  ]),
  description: z.string().trim().max(400).nullable().optional(),
  taken_at: dateStringSchema.nullable().optional(),
});

export const chartEntrySchema = z.object({
  patient_id: uuidSchema,
  encounter_id: uuidSchema.nullable().optional(),
  tooth: z.number().int().min(11).max(85),
  dentition: z.enum(["permanent", "deciduous"]),
  face: z.enum(["vestibular", "lingual", "mesial", "distal", "occlusal", "incisal"]),
  state: z.enum([
    "sana",
    "caries",
    "obturada",
    "fractura",
    "desgaste",
    "sellante",
    "ausente",
    "por_extraer",
    "extraida",
    "endodoncia",
    "corona",
    "puente",
    "implante",
    "protesis_removible",
    "incluida",
  ]),
  recorded_at: dateStringSchema.optional(),
});

export const periodontalSchema = z.object({
  patient_id: uuidSchema,
  encounter_id: uuidSchema.nullable().optional(),
  tooth: z.number().int().min(11).max(85),
  depths: z
    .record(z.string(), z.array(z.number().int().min(0).max(15)))
    .optional(),
  bleeding_on_probing: z.boolean().nullable().optional(),
  recession: z.number().int().min(0).max(10).nullable().optional(),
  mobility: z.number().int().min(0).max(3),
  furcation: z.string().trim().max(20).nullable().optional(),
  diagnosis: z.string().trim().max(1000).nullable().optional(),
  recorded_at: dateStringSchema.optional(),
});

export const treatmentPlanItemSchema = z.object({
  patient_id: uuidSchema,
  encounter_id: uuidSchema.nullable().optional(),
  tooth: z.number().int().min(11).max(85).nullable().optional(),
  faces: z.array(z.string().max(20)).nullable().optional(),
  treatment_id: uuidSchema.nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  priority: z.number().int().min(1).max(10).nullable().optional(),
  stage: z.string().trim().max(300).nullable().optional(),
  value: z.number().min(0).max(999999999),
  status: z.enum(["pendiente", "aceptado", "en_curso", "realizado", "rechazado"]).optional(),
});

export const treatmentPlanPatchSchema = z.object({
  status: z.enum(["pendiente", "aceptado", "en_curso", "realizado", "rechazado"]),
  approved: z.boolean().optional(),
  value: z.number().min(0).max(999999999).optional(),
  tooth: z.number().int().min(11).max(85).nullable().optional(),
  faces: z.array(z.string().max(20)).nullable().optional(),
  treatment_id: uuidSchema.nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
});

export const catalogItemSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el tratamiento").max(120),
  default_value: z.number().min(0).max(999999999),
  active: z.boolean().optional(),
});

export const paymentMethodSchema = z.enum(["efectivo", "transferencia", "tarjeta", "otro"]);

export const paymentSchema = z.object({
  patient_id: uuidSchema,
  plan_item_id: uuidSchema.nullable().optional(),
  amount: z.number().min(1, "El monto debe ser mayor a cero").max(999999999),
  paid_at: dateStringSchema.optional(),
  method: paymentMethodSchema.optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

export const auditQuerySchema = z.object({
  entity: z.string().trim().max(60).optional(),
  entity_id: z.string().trim().max(64).optional(),
  patient_id: uuidSchema.optional(),
  action: z
    .enum(["insert", "update", "delete", "sign", "export", "view", "contact"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});