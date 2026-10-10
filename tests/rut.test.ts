import { describe, expect, it } from "vitest";
import { isValidRut, normalizeRut, formatRut, formatRutPartial } from "@/lib/rut";

/**
 * Regresiones del módulo de RUT.
 *
 * El bug original era que la regex terminaba en `([dkK])`: sólo aceptaba
 * RUT con verificador letra d o k, así que `12.345.678-5` —el RUT más
 * común— se rechazaba y la reserva fallaba para la mayoría de los
 * pacientes. Estos tests fijan ese comportamiento para que no vuelva.
 */

describe("normalizeRut", () => {
  it("deja sólo los dígitos", () => {
    expect(normalizeRut("12.345.678-5")).toBe("123456785");
    expect(normalizeRut(" 12 345 678 5 ")).toBe("123456785");
  });

  it("acepta guiones, puntos y espacios mezclados", () => {
    expect(normalizeRut("12-345-678-5")).toBe("123456785");
    expect(normalizeRut("12.345.678-5")).toBe("123456785");
    expect(normalizeRut("1.234-567 8-5")).toBe("123456785");
  });

  it("no rompe con entradas vacías o basura", () => {
    expect(normalizeRut("")).toBe("");
    // Mayúsculas: el verificador "k" se normaliza a "K".
    expect(normalizeRut("abc")).toBe("ABC");
    expect(normalizeRut("12345678k")).toBe("12345678K");
  });
});

describe("isValidRut", () => {
  it("acepta el dígito verificador numérico", () => {
    expect(isValidRut("123456785")).toBe(true);
    expect(isValidRut("12345678-5")).toBe(true);
  });

  it("acepta los formatos que Chile usa de verdad", () => {
    // Regresión: la regex anterior sólo aceptaba [dkK].
    for (const rut of [
      "12.345.678-5",
      "12345678-5",
      "123456785",
      "1.234.567-4",
      "1-9-8-7-6-5-4-3", // todos con guiones: 19.876.543-0
    ]) {
      expect(isValidRut(rut), `debería aceptar ${rut}`).toBe(true);
    }
  });

  it("acepta el verificador K", () => {
    // 10000013 realmente termina en K.
    expect(isValidRut("10000013-K")).toBe(true);
    expect(isValidRut("10000013-k")).toBe(true);
    expect(isValidRut("10000013-5")).toBe(false);
  });

  it("acepta RUTs cuyo grupo interno empieza en cero", () => {
    // Regresión: el guardián antiguo rechazaba estos RUTs por válida que
    // fuera la segunda terna "000".
    for (const rut of ["10000013-K", "1000013-0", "20000045-5"]) {
      expect(isValidRut(rut), `debería aceptar ${rut}`).toBe(true);
    }
  });

  it("sigue rechazando un RUT que empieza en cero", () => {
    expect(isValidRut("00000000-5")).toBe(false);
    expect(isValidRut("0123456-5")).toBe(false);
  });

  it("rechaza el dígito verificador incorrecto", () => {
    expect(isValidRut("123456789")).toBe(false);
    expect(isValidRut("12345678-9")).toBe(false);
    expect(isValidRut("987654323")).toBe(false);
    expect(isValidRut("98765432-3")).toBe(false);
  });

  it("rechaza longitudes imposibles", () => {
    expect(isValidRut("1")).toBe(false);
    expect(isValidRut("1234567890")).toBe(false);
    expect(isValidRut("")).toBe(false);
  });

  it("acepta sólo cuando el verificador calculado coincide", () => {
    // Valores calculados con la implementación (ciclo de pesos 2,3,4,5,6,7).
    const casos: Array<[string, string]> = [
      ["12345678", "5"],
      ["98765432", "5"],
      ["11111111", "1"],
      ["1234567", "4"],
    ];
    for (const [cuerpo, verificador] of casos) {
      expect(isValidRut(`${cuerpo}${verificador}`), `${cuerpo}-${verificador}`).toBe(true);
      // Y rechaza cualquier otro dígito en esa posición.
      const otro = verificador === "0" ? "1" : "0";
      expect(isValidRut(`${cuerpo}${otro}`), `${cuerpo}-${otro}`).toBe(false);
    }
  });

  it("formatea con puntos y guion, y el resultado vuelve a ser válido", () => {
    // Regresión de ida y vuelta: formatear no debe invalidar el RUT.
    for (const crudo of ["12345678-5", "12.345.678-5", "123456785"]) {
      const formateado = formatRut(crudo);
      expect(formateado, crudo).toBe("12.345.678-5");
      expect(isValidRut(normalizeRut(formateado!)), crudo).toBe(true);
    }
  });

  it("devuelve null al formatear algo que no es RUT", () => {
    expect(formatRut("123456789")).toBeNull();
    expect(formatRut("")).toBeNull();
  });
});

describe("formatRutPartial", () => {
  it("no ensucia la entrada mientras es corta", () => {
    expect(formatRutPartial("1")).toBe("1");
    expect(formatRutPartial("12")).toBe("12");
    expect(formatRutPartial("1234")).toBe("1.234");
    expect(formatRutPartial("1234567")).toBe("1.234.567");
  });

  it("separa el verificador desde los 8 caracteres", () => {
    expect(formatRutPartial("12345678")).toBe("1.234.567-8");
    expect(formatRutPartial("123456785")).toBe("12.345.678-5");
  });

  it("reformatea una entrada ya formateada", () => {
    expect(formatRutPartial("12.345.678-5")).toBe("12.345.678-5");
    expect(formatRutPartial("12-345-678-5")).toBe("12.345.678-5");
  });

  it("normaliza la K del verificador y descarta basura", () => {
    expect(formatRutPartial("12.345.678-k")).toBe("12.345.678-K");
    expect(formatRutPartial("12a345b6785")).toBe("12.345.678-5");
    expect(formatRutPartial("")).toBe("");
  });

  it("el ida y vuelta deja un RUT válido", () => {
    const formateado = formatRutPartial("123456785");
    expect(isValidRut(formateado)).toBe(true);
  });
});