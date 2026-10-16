import { describe, expect, it } from "vitest";
import { isInfraError } from "@/lib/errors";
import { staffBookingSchema, staffRescheduleSchema } from "@/lib/validation";

const SERVICE = "11111111-1111-4111-8111-111111111111";
const DOCTOR = "22222222-2222-4222-8222-222222222222";
const CITA = "33333333-3333-4333-8333-333333333333";

const reservaBase = {
  serviceId: SERVICE,
  doctorId: DOCTOR,
  slotStart: "2026-10-20T14:00:00.000Z",
  fullName: "Carla Muñoz",
  rut: "12.345.678-5",
  phone: "+56912345678",
  email: "carla@correo.cl",
};

describe("staffBookingSchema: reserva del equipo", () => {
  it("acepta una reserva completa válida", () => {
    expect(staffBookingSchema.safeParse(reservaBase).success).toBe(true);
  });

  it("exige profesional explícito (nada de 'cualquiera disponible')", () => {
    const sinDoctor = staffBookingSchema.safeParse({ ...reservaBase, doctorId: undefined });
    expect(sinDoctor.success).toBe(false);
  });

  it("rechaza RUT con verificador malo y slot corto", () => {
    expect(staffBookingSchema.safeParse({ ...reservaBase, rut: "12.345.678-9" }).success).toBe(false);
    expect(staffBookingSchema.safeParse({ ...reservaBase, slotStart: "hoy" }).success).toBe(false);
  });
});

describe("isInfraError: errores de infraestructura no son de negocio", () => {
  it("detecta función inexistente (migración sin aplicar) y fallas de red", () => {
    expect(isInfraError({ code: "PGRST202", message: "Could not find the function" })).toBe(true);
    expect(isInfraError(new TypeError("fetch failed"))).toBe(true);
  });

  it("no confunde errores de negocio ni respuestas normales", () => {
    expect(isInfraError({ code: "A0001", message: "hora_ya_tomada" })).toBe(false);
    expect(isInfraError({ message: "hora_ya_tomada" })).toBe(false);
    expect(isInfraError(null)).toBe(false);
    expect(isInfraError("boom")).toBe(false);
  });
});
describe("staffRescheduleSchema: reprogramación del equipo", () => {
  it("acepta mover manteniendo el profesional", () => {
    expect(
      staffRescheduleSchema.safeParse({ appointmentId: CITA, slotStart: "2026-10-21T15:00:00.000Z" }).success,
    ).toBe(true);
  });

  it("acepta mover cambiando de profesional", () => {
    expect(
      staffRescheduleSchema.safeParse({
        appointmentId: CITA,
        slotStart: "2026-10-21T15:00:00.000Z",
        doctorId: DOCTOR,
      }).success,
    ).toBe(true);
  });

  it("rechaza id no uuid", () => {
    expect(
      staffRescheduleSchema.safeParse({ appointmentId: "no-uuid", slotStart: "2026-10-21T15:00:00.000Z" })
        .success,
    ).toBe(false);
  });
});
