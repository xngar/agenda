import { describe, expect, it } from "vitest";
import { formatPhonePartial, isValidPhone, normalizePhone } from "@/lib/phone";

/**
 * Regresiones del teléfono del flujo de reserva.
 *
 * El paciente escribe sólo el resto del número: el prefijo +56 va siempre.
 * La reserva guarda el teléfono normalizado ("+56XXXXXXXXX") y la ficha del
 * paciente lo recibe igual, así que estos tests fijan ese contrato.
 */

describe("formatPhonePartial", () => {
  it("mantiene el prefijo +56 incluso vacío", () => {
    expect(formatPhonePartial("")).toBe("+56 ");
    expect(formatPhonePartial("+56 ")).toBe("+56 ");
  });

  it("agrupa un móvil mientras se escribe", () => {
    expect(formatPhonePartial("9")).toBe("+56 9");
    expect(formatPhonePartial("9123")).toBe("+56 9 123");
    expect(formatPhonePartial("912345678")).toBe("+56 9 1234 5678");
  });

  it("acepta el número pegado con código de país", () => {
    expect(formatPhonePartial("+56912345678")).toBe("+56 9 1234 5678");
    expect(formatPhonePartial("56912345678")).toBe("+56 9 1234 5678");
  });

  it("no duplica el prefijo al re-formatear", () => {
    const una = formatPhonePartial("912345678");
    expect(formatPhonePartial(una)).toBe("+56 9 1234 5678");
  });
});

describe("normalizePhone", () => {
  it("deja el número listo para guardar", () => {
    expect(normalizePhone("+56 9 1234 5678")).toBe("+56912345678");
    expect(normalizePhone("912345678")).toBe("+56912345678");
    expect(normalizePhone("+56912345678")).toBe("+56912345678");
  });

  it("devuelve vacío si no hay dígitos", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("+56 ")).toBe("");
  });
});

describe("isValidPhone", () => {
  it("acepta móviles y fijos", () => {
    expect(isValidPhone("+56 9 1234 5678")).toBe(true);
    expect(isValidPhone("22345678")).toBe(true);
  });

  it("rechaza números incompletos", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("+56 9")).toBe(false);
    expect(isValidPhone("1234567")).toBe(false);
  });
});
