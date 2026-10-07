import { z } from "zod";
import { isValidRut } from "./rut";

/**
 * Validación de entradas (todas, siempre en el servidor).
 * Los mensajes van en español de Chile para poder mostrarlos tal cual.
 */

const rutSchema = z
  .string()
  .trim()
  .min(1, "Ingresa tu RUT")
  .max(16, "El RUT es demasiado largo")
  // El dígito verificador se valida acá, no en la capa de negocio: si
  // espera hasta después, el paciente ve "ese horario no está
  // disponible" cuando el problema era su RUT, y busca la hora equivocada.
  .refine(isValidRut, "Revisa el RUT: el dígito verificador no coincide");

const fullNameSchema = z
  .string()
  .trim()
  .min(3, "Ingresa tu nombre completo")
  .max(120, "El nombre es demasiado largo");

const phoneSchema = z
  .string()
  .trim()
  .min(8, "Ingresa un teléfono válido")
  .max(20, "El teléfono es demasiado largo")
  .regex(/^\+?[0-9\s-]{8,20}$/, "El teléfono sólo puede contener números");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Ingresa un correo válido")
  .max(180, "El correo es demasiado largo")
  .email("Ingresa un correo válido");

const uuidSchema = z.string().uuid("Referencia inválida");

const isoInstantSchema = z
  .string()
  .datetime({ offset: true, message: "Fecha y hora inválidas" });

/** Paso 1 del wizard. */
export const serviceSelectionSchema = z.object({
  serviceId: uuidSchema,
});

/** Paso 2 del wizard: doctor concreto o "cualquiera disponible". */
export const doctorSelectionSchema = z.object({
  doctorId: uuidSchema.nullable(),
});

/** Paso 3 del wizard. */
export const slotSelectionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  slotStart: isoInstantSchema,
  doctorId: uuidSchema.nullable(),
});

/** Paso 4 del wizard: datos del paciente y consentimiento. */
export const patientDetailsSchema = z.object({
  fullName: fullNameSchema,
  rut: rutSchema,
  phone: phoneSchema,
  email: emailSchema,
  serviceId: uuidSchema,
  doctorId: uuidSchema.nullable(),
  slotStart: isoInstantSchema,
  consent: z.literal(true, {
    error: "Necesitamos tu autorización para guardar tus datos",
  }),
  turnstileToken: z.string().optional(),
});

export type PatientDetailsInput = z.infer<typeof patientDetailsSchema>;

export const cancelSchema = z.object({
  reason: z.string().trim().max(500, "El motivo es demasiado largo").optional(),
});

export const rescheduleSchema = z.object({
  slotStart: isoInstantSchema,
  doctorId: uuidSchema.nullable().optional(),
});

/** Login del doctor. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "La contraseña es demasiado corta").max(200),
});

/** Cambio de estado desde el dashboard. */
export const doctorUpdateSchema = z
  .object({
    status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]),
    reason: z.string().trim().max(500).optional(),
    slotStart: isoInstantSchema.optional(),
    doctorId: uuidSchema.optional(),
  })
  .refine((v) => v.status !== "cancelled" || v.reason !== undefined, {
    message: "Indica el motivo de la cancelación",
    path: ["reason"],
  });

/** Estructura de una regla de disponibilidad semanal, antes de validaciones. */
const availabilityRuleObject = z.object({
  doctorId: uuidSchema,
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
});

/** Regla de disponibilidad semanal. */
export const availabilityRuleSchema = availabilityRuleObject.refine(
  (v) => v.endTime > v.startTime,
  {
    message: "La hora de término debe ser posterior al inicio",
    path: ["endTime"],
  },
);

/**
 * Regla de una sola franja, sin el id del profesional.
 *
 * Se separa porque el formulario envía el `doctorId` sólo al principio, no
 * en cada franja. Las horas van con dos dígitos (`09:00`, no `9:00`) para
 * que la comparación por texto de abajo funcione igual que en la base.
 *
 * `availabilityRuleObject` se mantiene aparte del esquema final porque
 * Zod no permite `.omit()` sobre un esquema con `refine`.
 */
export const availabilitySlotSchema = availabilityRuleObject.omit({ doctorId: true }).refine(
  (v) => v.endTime > v.startTime,
  {
    message: "La hora de término debe ser posterior al inicio",
    path: ["endTime"],
  },
);

/** El horario completo de un profesional. */
export const availabilityRulesSchema = z.object({
  doctorId: uuidSchema,
  rules: z.array(availabilitySlotSchema).max(21, "Demasiadas franjas de horario"),
});

/**
 * Dos franjas del mismo día no pueden solaparse.
 *
 * Por separado y no como `refine` del esquema para poder usarlo en cliente
 * y en servidor con el MISMO mensaje: dos franjas que se cruzan generan la
 * misma hora dos veces en `get_available_slots` y el paciente la ve
 * duplicada en el asistente. Una regla invertida (fin antes que inicio) en
 * cambio la detecta el `refine` del esquema individual.
 */
export function availabilityOverlaps(
  rules: { weekday: number; startTime: string; endTime: string }[],
): boolean {
  const porDia = new Map<number, { start: string; end: string }[]>();
  for (const r of rules) {
    const lista = porDia.get(r.weekday) ?? [];
    lista.push({ start: r.startTime, end: r.endTime });
    porDia.set(r.weekday, lista);
  }

  for (const franjas of porDia.values()) {
    const ordenadas = [...franjas].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < ordenadas.length; i++) {
      if (ordenadas[i].start < ordenadas[i - 1].end) return true;
    }
  }
  return false;
}

export const availabilityOverlapMessage =
  "Dos franjas del mismo día no pueden solaparse";

/** Bloqueo / vacaciones. */
export const timeOffSchema = z
  .object({
    doctorId: uuidSchema,
    startsAt: isoInstantSchema,
    endsAt: isoInstantSchema,
    reason: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.endsAt > v.startsAt, {
    message: "El bloqueo debe terminar después de empezar",
    path: ["endsAt"],
  });

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "El nombre es demasiado corto").max(80),
  durationMin: z.number().int().min(5, "Mínimo 5 minutos").max(480, "Máximo 8 horas"),
  active: z.boolean().default(true),
});

/** Alta de un miembro del equipo desde el panel del administrador. */
export const doctorSchema = z.object({
  email: emailSchema,
  fullName: fullNameSchema,
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
  specialty: z.string().trim().max(80).optional(),
  role: z.enum(["professional", "reception"]).default("professional"),
  isAdmin: z.boolean().default(false),
});

export const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  name: z.string().trim().min(2, "Indica el nombre del feriado").max(120),
});

export const clinicSettingsSchema = z.object({
  name: z.string().trim().min(2, "El nombre es demasiado corto").max(120),
  slotStepMin: z.number().int().min(5).max(240),
  minNoticeHours: z.number().int().min(0).max(720),
  maxDaysAhead: z.number().int().min(1).max(730),
  cancelMinHours: z.number().int().min(0).max(720),
});

export { emailSchema, fullNameSchema, phoneSchema, rutSchema, uuidSchema };