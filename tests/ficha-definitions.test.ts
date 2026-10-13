import { describe, expect, it } from "vitest";
import {
  fichaFor,
  validateEncounterData,
  validateProfile,
  ORG_TYPE_LABEL,
} from "@/lib/ficha/definitions";

describe("ficha por tipo de organización", () => {
  it("los tres tipos tienen definición con campos de perfil y encuentro", () => {
    for (const type of ["dental", "medical", "psychological"] as const) {
      const ficha = fichaFor(type);
      expect(ficha.profileFields.length).toBeGreaterThan(0);
      expect(ficha.encounterFields.length).toBeGreaterThan(0);
      expect(ORG_TYPE_LABEL[type]).toBeTruthy();
    }
  });

  it("el perfil psicológico acepta sus campos y rechaza tipos inválidos", () => {
    const ok = validateProfile("psychological", { riskFactors: "Ideación sin plan", notes: "x" });
    expect(ok.success).toBe(true);

    const malo = validateProfile("psychological", { riskFactors: 42 });
    expect(malo.success).toBe(false);
  });

  it("el encuentro psicológico acepta safetyConcerns y notas privadas", () => {
    const ok = validateEncounterData("psychological", {
      currentState: "Ansioso",
      safetyConcerns: true,
      privateNotes: "Reservado",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect((ok.data as Record<string, unknown>).safetyConcerns).toBe(true);
    }
  });

  it("el perfil médico acepta vitales nulos parciales", () => {
    const ok = validateEncounterData("medical", {
      symptoms: "Cefalea",
      vitals: { systolicMmHg: 120, diastolicMmHg: 80 },
    });
    expect(ok.success).toBe(true);
  });

  it("valida objeto vacío como perfil sin datos", () => {
    expect(validateProfile("dental", {}).success).toBe(true);
    expect(validateProfile("dental", undefined).success).toBe(true);
  });
});
