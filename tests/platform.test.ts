import { describe, expect, it } from "vitest";
import { formatSlugValue, slugPattern } from "@/lib/platform";

describe("formatSlugValue", () => {
  it("espacios a guiones, minúsculas y sin tildes", () => {
    expect(formatSlugValue("Clínica San José")).toBe("clinica-san-jose");
  });

  it("colapsa guiones y quita caracteres raros", () => {
    expect(formatSlugValue("Mi  Clínica!! -- Dental")).toBe("mi-clinica-dental");
    expect(formatSlugValue("clínica_dental")).toBe("clinica-dental");
  });

  it("lo ya válido queda igual y pasa el patrón del formulario", () => {
    for (const slug of ["sonrisa-dental", "clinica1", "a-b-c"]) {
      expect(formatSlugValue(slug)).toBe(slug);
      expect(slugPattern.test(formatSlugValue(slug))).toBe(true);
    }
  });

  it("vacío queda vacío", () => {
    expect(formatSlugValue("")).toBe("");
  });
});
