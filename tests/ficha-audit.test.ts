import { describe, expect, it } from "vitest";
import { detalleAuditoria, redactAuditSummary } from "@/lib/ficha/audit-view";

describe("detalleAuditoria", () => {
  it("describe la firma con fecha y motivo", () => {
    expect(
      detalleAuditoria({
        action: "sign",
        entity: "encounters",
        summary: { started_at: "2026-10-06T00:00:00Z", motivo: "Control post-tratamiento" },
      }),
    ).toBe("Firmó la atención del 2026-10-06 · Control post-tratamiento");
  });

  it("describe el odontograma por pieza, cara y estado", () => {
    expect(
      detalleAuditoria({
        action: "insert",
        entity: "dental_chart_entries",
        summary: { tooth: 16, face: "occlusal", state: "caries" },
      }),
    ).toBe("Pieza 16 · Oclusal: Caries");
  });

  it("describe recetas, planes, pagos y pacientes", () => {
    expect(
      detalleAuditoria({
        action: "insert",
        entity: "prescriptions",
        summary: { medication: "Paracetamol", dose: "500mg" },
      }),
    ).toBe("Receta: Paracetamol · 500mg");
    expect(
      detalleAuditoria({
        action: "insert",
        entity: "dental_treatment_plan_items",
        summary: { description: "Obturación", tooth: 16 },
      }),
    ).toBe("Agregó al plan: Obturación");
    expect(
      detalleAuditoria({ action: "insert", entity: "dental_payments", summary: { amount: 50000 } }),
    ).toContain("50.000");
    expect(
      detalleAuditoria({
        action: "insert",
        entity: "patients",
        summary: { full_name: "Ana Prueba" },
      }),
    ).toBe("Creó la ficha de Ana Prueba");
  });

  it("sin datos devuelve vacío en vez de JSON crudo", () => {
    expect(detalleAuditoria({ action: "update", entity: "otro", summary: {} })).toBe("");
  });
});

describe("redactAuditSummary", () => {
  it("quita privateNotes del nivel superior", () => {
    expect(
      redactAuditSummary({ currentState: "Estable", privateNotes: "Reservado" }),
    ).toEqual({ currentState: "Estable" });
  });

  it("quita privateNotes dentro de snapshots anidados", () => {
    const entrada = {
      snapshot: {
        motivo: "Control",
        specialty_data: { observations: "x", privateNotes: "Reservado" },
      },
    };
    expect(redactAuditSummary(entrada)).toEqual({
      snapshot: { motivo: "Control", specialty_data: { observations: "x" } },
    });
  });

  it("deja intacto lo que no tiene notas privadas", () => {
    const entrada = { tooth: 16, state: "caries" };
    expect(redactAuditSummary(entrada)).toEqual(entrada);
  });
});
