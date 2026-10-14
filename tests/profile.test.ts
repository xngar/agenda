import { describe, expect, it } from "vitest";
import { profilePasswordSchema, profileUpdateSchema } from "@/lib/validation";

describe("Mi perfil", () => {
  it("acepta nombre y especialidad válida", () => {
    const parsed = profileUpdateSchema.safeParse({ fullName: "Macarena Allende", specialty: "Psicología" });
    expect(parsed.success).toBe(true);
  });

  it("rechaza nombre demasiado corto", () => {
    const parsed = profileUpdateSchema.safeParse({ fullName: "Al" });
    expect(parsed.success).toBe(false);
  });

  it("rechaza especialidad demasiado larga", () => {
    const parsed = profileUpdateSchema.safeParse({ fullName: "Macarena Allende", specialty: "x".repeat(81) });
    expect(parsed.success).toBe(false);
  });

  it("la clave nueva exige mínimo 8 y la actual no va vacía", () => {
    expect(profilePasswordSchema.safeParse({ actual: "", nueva: "NuevaClave2026!" }).success).toBe(false);
    expect(profilePasswordSchema.safeParse({ actual: "Actual2026!", nueva: "corta" }).success).toBe(false);
    expect(profilePasswordSchema.safeParse({ actual: "Actual2026!", nueva: "NuevaClave2026!" }).success).toBe(true);
  });
});
