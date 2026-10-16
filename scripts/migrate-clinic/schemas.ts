import { z } from "zod";
import { isValidRut, normalizeRut } from "@/lib/rut";
import { normalizePhone } from "@/lib/phone";

const TZ = "America/Santiago";

export const ESTADO = {
  confirmada: "confirmed",
  por_confirmar: "pending",
  cancelada: "cancelled",
  realizada: "completed",
  no_asistio: "no_show",
} as const;

export type EstadoCsv = keyof typeof ESTADO;

const emailish = z.string().trim().toLowerCase();
const optText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const profesionalRow = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: emailish.email("correo inválido"),
  especialidad: optText(120),
  admin: z.string().trim().optional().or(z.literal("")),
  id_externo: optText(80),
});

export const servicioRow = z.object({
  nombre: z.string().trim().min(1).max(120),
  duracion_min: z.coerce.number().int().positive().max(480),
  id_externo: optText(80),
});

const SEXOS = ["female", "male", "other", "undisclosed"] as const;

export const pacienteRow = z.object({
  nombre: z.string().trim().min(2).max(120),
  rut: z.string().trim().optional().or(z.literal("")),
  telefono: z.string().trim().optional().or(z.literal("")),
  email: emailish.optional().or(z.literal("")),
  fecha_nacimiento: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_nacimiento debe ser YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  sexo: z.enum(SEXOS).optional().or(z.literal("")),
  profesional: z.string().trim().optional().or(z.literal("")),
  id_externo: optText(80),
});

export const citaRow = z.object({
  profesional: z.string().trim().min(1).max(180),
  paciente: z.string().trim().min(1).max(180),
  servicio: z.string().trim().max(120).optional().or(z.literal("")),
  inicio: z.string().trim().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, "inicio debe ser YYYY-MM-DD HH:MM"),
  estado: z.enum(["confirmada", "por_confirmar", "cancelada", "realizada", "no_asistio", ""]).optional().or(z.literal("")),
  motivo: optText(1000),
  motivo_cancelacion: optText(500),
});

export interface RowIssue {
  file: string;
  line: number;
  message: string;
}

export function rutValido(raw: string): boolean {
  if (!raw.trim()) return true;
  return isValidRut(raw);
}

export function rutLimpio(raw: string): string {
  return normalizeRut(raw);
}

export function telefonoLimpio(raw: string): string {
  return normalizePhone(raw);
}

export function esAdmin(raw: string | undefined): boolean {
  return (raw ?? "").trim().toLowerCase() === "si";
}

export function estadoDb(raw: string | undefined, inicioFutura: boolean): keyof typeof ESTADO | "confirmada" | "realizada" {
  const v = (raw ?? "").trim();
  if (v === "") return inicioFutura ? "confirmada" : "realizada";
  return v as EstadoCsv;
}

export { TZ };
