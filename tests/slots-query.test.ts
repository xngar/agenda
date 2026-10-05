import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * Réplica exacta del esquema de `app/api/slots/route.ts`.
 *
 * Se reproduce aquí a propósito: el bug era de ORDEN de modificadores en
 * Zod, no de lógica de negocio, y conviene poder probarlo sin levantar el
 * servidor.
 */
const querySchema = z.object({
  date: z.string().min(1),
  serviceId: z.string().uuid("Servicio inválido"),
  doctorId: z.preprocess(
    (v) => (v === "" || v === "any" || v === "null" ? undefined : v),
    z.string().uuid("Profesional inválido").optional(),
  ),
});

const SERVICE = "dccfd3d6-7e66-460b-93ce-989ecbfe270f";
const DOCTOR = "3a335e2c-9881-473a-a98c-94c3661b977e";

function parse(doctorId: unknown) {
  return querySchema.safeParse({
    date: "2026-10-06",
    serviceId: SERVICE,
    doctorId,
  });
}

describe("esquema de /api/slots", () => {
  it("acepta la cadena vacía como 'cualquiera disponible'", () => {
    // El asistente manda `doctorId=` cuando el paciente elige
    // "Cualquiera disponible". Antes esto daba 400 y el paso 3 del
    // asistente no mostraba ninguna hora.
    const resultado = parse("");
    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data.doctorId).toBeUndefined();
  });

  it("acepta también 'any' y 'null'", () => {
    for (const valor of ["any", "null", undefined]) {
      expect(parse(valor).success, `doctorId=${String(valor)}`).toBe(true);
    }
  });

  it("sigue aceptando un uuid real", () => {
    const resultado = parse(DOCTOR);
    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data.doctorId).toBe(DOCTOR);
  });

  it("rechaza un doctorId que no es uuid", () => {
    expect(parse("no-es-uuid").success).toBe(false);
    expect(parse("123").success).toBe(false);
  });

  it("rechaza un serviceId inválido", () => {
    const resultado = z
      .object({ serviceId: z.string().uuid("Servicio inválido") })
      .safeParse({ serviceId: "basura" });
    expect(resultado.success).toBe(false);
  });

  it("demuestra por qué el orden importa: el transform clásico no funciona", () => {
    // Esta es la versión que estaba en el repo y que rompía el flujo.
    const schemaErrado = z.object({
      doctorId: z
        .string()
        .uuid("Profesional inválido")
        .optional()
        .transform((v) => (v === "" ? null : v)),
    });

    // `.uuid()` valida ANTES de transformar: la cadena vacía falla y el
    // transform queda como código muerto.
    expect(schemaErrado.safeParse({ doctorId: "" }).success).toBe(false);

    // Por eso hace falta `z.preprocess`.
    const schemaBueno = z.object({
      doctorId: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional()),
    });
    expect(schemaBueno.safeParse({ doctorId: "" }).success).toBe(true);
  });
});