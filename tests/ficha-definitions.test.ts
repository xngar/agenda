import { describe, expect, it } from "vitest";
import {
  fichaFor,
  validateEncounterData,
  validateProfile,
  ORG_TYPE_LABEL,
} from "@/lib/ficha/definitions";
import { cie10Schema, calcularIMC, etiquetaIMC } from "@/lib/ficha/medical";
import { interpretarGAD7, interpretarPHQ9 } from "@/lib/ficha/psychological";
import { consentAcceptanceSchema, consentSchema, paymentSchema } from "@/lib/ficha/schemas";

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

  it("valida rangos amplios y unidades plausibles para signos vitales médicos", () => {
    expect(
      validateEncounterData("medical", {
        vitals: {
          temperatureC: 36.5,
          systolicMmHg: 120,
          diastolicMmHg: 80,
          heartRateBpm: 72,
          respiratoryRate: 16,
          spo2: 98,
          weightKg: 70,
          heightCm: 175,
        },
      }).success,
    ).toBe(true);

    expect(validateEncounterData("medical", { vitals: { temperatureC: 100 } }).success).toBe(false);
    expect(validateEncounterData("medical", { vitals: { systolicMmHg: 999 } }).success).toBe(false);
    expect(validateEncounterData("medical", { vitals: { spo2: 101 } }).success).toBe(false);
    expect(validateEncounterData("medical", { vitals: { heightCm: 400 } }).success).toBe(false);
  });

  it("valida objeto vacío como perfil sin datos", () => {
    expect(validateProfile("dental", {}).success).toBe(true);
    expect(validateProfile("dental", undefined).success).toBe(true);
  });
});

describe("fase 3: campos por especialidad", () => {
  it("CIE-10 rechaza rangos de capítulo y explica el formato", () => {
    expect(cie10Schema.safeParse("G00-G99").success).toBe(false);
    expect(cie10Schema.safeParse("G00G99").success).toBe(false);
    expect(cie10Schema.safeParse(" j06.9 ").success).toBe(true);
    const malo = cie10Schema.safeParse("G00-G99");
    expect(malo.success).toBe(false);
    if (!malo.success) {
      expect(malo.error.issues[0]?.message).toContain("G00-G99");
    }
  });
  it("CIE-10 acepta códigos válidos y rechaza basura", () => {
    expect(cie10Schema.safeParse("J06.9").success).toBe(true);
    expect(cie10Schema.safeParse("j06.9").success).toBe(true);
    expect(cie10Schema.safeParse("F32").success).toBe(true);
    expect(cie10Schema.safeParse("").success).toBe(true);
    expect(cie10Schema.safeParse(undefined).success).toBe(true);
    expect(cie10Schema.safeParse("no-es-codigo").success).toBe(false);
    expect(cie10Schema.safeParse("123").success).toBe(false);
  });

  it("el encuentro médico acepta examen físico, CIE-10, licencia y derivación", () => {
    const ok = validateEncounterData("medical", {
      physicalExam: "Sin hallazgos",
      cie10: "J06.9",
      labOrders: "Hemograma",
      sickLeaveFolio: "123456-7",
      sickLeaveDays: "5",
      sickLeaveFrom: "2026-10-14",
      referral: "Derivación a otorrino",
    });
    expect(ok.success).toBe(true);

    const malo = validateEncounterData("medical", { cie10: "zzz" });
    expect(malo.success).toBe(false);
  });

  it("el perfil médico acepta quirúrgicos y vacunas", () => {
    expect(
      validateProfile("medical", { surgicalHistory: "Apendicectomía 2015", vaccines: "COVID al día" })
        .success,
    ).toBe(true);
  });

  it("IMC se calcula y etiqueta correctamente", () => {
    expect(calcularIMC(70, 175)).toBeCloseTo(22.9, 1);
    expect(etiquetaIMC(22.9)).toBe("Normal");
    expect(etiquetaIMC(17)).toBe("Bajo peso");
    expect(etiquetaIMC(27)).toBe("Sobrepeso");
    expect(etiquetaIMC(32)).toBe("Obesidad");
    expect(calcularIMC(null, 175)).toBeNull();
    expect(calcularIMC(70, 0)).toBeNull();
    expect(calcularIMC("70", 175)).toBeNull();
  });

  it("el encuentro psicológico acepta modalidad, escalas y DSM-5", () => {
    const ok = validateEncounterData("psychological", {
      modality: "online",
      phq9: 12,
      gad7: "7",
      dsm5: "F32.0",
    });
    expect(ok.success).toBe(true);

    expect(validateEncounterData("psychological", { modality: "carrier" }).success).toBe(false);
    expect(validateEncounterData("psychological", { phq9: 28 }).success).toBe(false);
    expect(validateEncounterData("psychological", { gad7: -1 }).success).toBe(false);
  });

  it("el encuentro psicológico valida seguimiento de sesión y límites de duración", () => {
    expect(
      validateEncounterData("psychological", {
        attendance: "attended",
        durationMinutes: 50,
        interventions: "Psicoeducación",
        response: "Participa durante la sesión",
        goalsProgress: "Avance parcial",
        nextSteps: "Continuar seguimiento",
        riskResponse: "Se acuerda seguimiento clínico",
      }).success,
    ).toBe(true);
    expect(validateEncounterData("psychological", { durationMinutes: 0 }).success).toBe(false);
    expect(validateEncounterData("psychological", { attendance: "absent" }).success).toBe(false);
  });

  it("el consentimiento requiere aceptación confirmada y vínculo del representante", () => {
    const base = {
      kind: "psicoterapia",
      accepted_text: "Texto de consentimiento informado suficientemente largo.",
      accepted_by_patient: true,
      accepted_by_name: "Nombre Paciente",
      acceptance_method: "documento",
      acceptance_channel: "presencial",
      evidence_attachment_id: "00000000-0000-0000-0000-000000000000",
      decisionConfirmed: true,
    };
    expect(consentAcceptanceSchema.safeParse(base).success).toBe(true);
    expect(
      consentAcceptanceSchema.safeParse({ ...base, decisionConfirmed: false }).success,
    ).toBe(false);
    expect(
      consentAcceptanceSchema
        .safeParse({ ...base, accepted_by_patient: false, accepted_by_relation: "" }).success,
    ).toBe(false);
    expect(
      consentSchema.safeParse({
        ...base,
        patient_id: "00000000-0000-0000-0000-000000000000",
      }).success,
    ).toBe(true);
    expect(
      consentAcceptanceSchema.safeParse({
        ...base,
        kind: "datos_personales",
        acceptance_method: "verbal",
        acceptance_channel: "videollamada",
        evidence_attachment_id: null,
      }).success,
    ).toBe(true);
    expect(
      consentAcceptanceSchema.safeParse({
        ...base,
        acceptance_method: "documento",
        evidence_attachment_id: null,
      }).success,
    ).toBe(false);
    expect(
      consentAcceptanceSchema.safeParse({
        ...base,
        acceptance_channel: "desconocido",
      }).success,
    ).toBe(false);
    expect(
      consentAcceptanceSchema.safeParse({
        ...base,
        acceptance_channel: undefined,
      }).success,
    ).toBe(false);
  });

  it("el consentimiento médico requiere información clínica y permite registrar rechazo", () => {
    const medical = {
      kind: "medical_procedure",
      outcome: "rejected",
      procedure: "Endoscopía",
      purpose: "Evaluar síntomas digestivos",
      benefits: "Apoyar el diagnóstico",
      risks: "Molestias y riesgos propios del procedimiento",
      alternatives: "Evaluación clínica y otros exámenes",
      refusal_consequences: "Persistencia de síntomas y retraso diagnóstico",
      accepted_by_patient: true,
      accepted_by_name: "Nombre Paciente",
      acceptance_method: "verbal",
      acceptance_channel: "presencial",
      decisionConfirmed: true,
    };
    expect(consentAcceptanceSchema.safeParse(medical).success).toBe(true);
    expect(
      consentAcceptanceSchema.safeParse({ ...medical, risks: "" }).success,
    ).toBe(false);
    expect(
      consentAcceptanceSchema.safeParse({ ...medical, outcome: "pending" }).success,
    ).toBe(false);
  });

  it("el encuentro psicológico trata escalas y selects vacíos como nulos", () => {
    const vacio = validateEncounterData("psychological", { phq9: "", gad7: "" });
    expect(vacio.success).toBe(true);
    if (vacio.success) {
      expect((vacio.data as Record<string, unknown>).phq9).toBeNull();
      expect((vacio.data as Record<string, unknown>).gad7).toBeNull();
    }

    const limpiado = validateEncounterData("psychological", { modality: "", attendance: "" });
    expect(limpiado.success).toBe(true);
    if (limpiado.success) {
      expect((limpiado.data as Record<string, unknown>).modality).toBeNull();
      expect((limpiado.data as Record<string, unknown>).attendance).toBeNull();
    }
  });

  it("el consentimiento dental acepta el tipo de tratamiento dental", () => {
    const dental = {
      kind: "tratamiento_dental",
      accepted_text: "Acepto el plan de tratamiento dental informado por el profesional.",
      accepted_by_patient: true,
      accepted_by_name: "Nombre Paciente",
      acceptance_method: "verbal",
      acceptance_channel: "presencial",
      decisionConfirmed: true,
    };
    expect(consentAcceptanceSchema.safeParse(dental).success).toBe(true);
  });

  it("interpreta PHQ-9 y GAD-7 en los rangos estándar", () => {
    expect(interpretarPHQ9(2)).toBe("Mínima");
    expect(interpretarPHQ9(7)).toBe("Leve");
    expect(interpretarPHQ9(12)).toBe("Moderada");
    expect(interpretarPHQ9(17)).toBe("Moderada-grave");
    expect(interpretarPHQ9(23)).toBe("Grave");
    expect(interpretarGAD7(3)).toBe("Mínima");
    expect(interpretarGAD7(12)).toBe("Moderada");
    expect(interpretarGAD7(20)).toBe("Grave");
    expect(interpretarPHQ9(undefined)).toBeNull();
    expect(interpretarGAD7("x")).toBeNull();
  });

  it("el perfil psicológico acepta plan terapéutico", () => {
    expect(
      validateProfile("psychological", {
        therapeuticApproach: "Cognitivo-conductual",
        therapyGoals: "Reducir ansiedad",
        sessionFrequency: "Semanal",
      }).success,
    ).toBe(true);
  });

  it("el perfil dental acepta higiene, última visita y alertas", () => {
    expect(
      validateProfile("dental", {
        lastVisit: "2026-03-10",
        hygiene: "Cepillado 2 veces al día, sin hilo",
        treatmentAlerts: "Anticoagulante: warfarina",
      }).success,
    ).toBe(true);
  });

  it("paymentSchema exige monto positivo y método válido", () => {
    expect(
      paymentSchema.safeParse({ patient_id: "00000000-0000-0000-0000-000000000000", amount: 50000 })
        .success,
    ).toBe(true);
    expect(
      paymentSchema.safeParse({ patient_id: "00000000-0000-0000-0000-000000000000", amount: 0 })
        .success,
    ).toBe(false);
    expect(
      paymentSchema.safeParse({
        patient_id: "00000000-0000-0000-0000-000000000000",
        amount: 1000,
        method: "cheque",
      }).success,
    ).toBe(false);
  });
});
