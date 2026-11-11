import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PatientQuickViewDetails } from "@/components/dashboard/patient-quick-view";
import type { PatientSummary } from "@/lib/ficha/summary-types";

const PACIENTE: PatientSummary["patient"] = {
  id: "pac-1",
  full_name: "Ana Soto",
  rut: "11111111-1",
  phone: "+56911111111",
  email: "ana@correo.cl",
  birth_date: "1990-04-02",
  sex: "female",
  patient_status: "active",
  prevision_type: "fonasa",
  fonasa_tramo: "B",
  isapre_name: null,
  isapre_plan: null,
  address: "Av. Siempre Viva 742",
  comuna: "Santiago",
  emergency_name: "Pedro Soto",
  emergency_relation: "Hermano",
  emergency_phone: "+56922222222",
  tutor_name: null,
  tutor_relation: null,
  tutor_phone: null,
  admitted_at: "2025-01-10T00:00:00Z",
  doctor_name: "Dra. Pérez",
  treatment_alerts: null,
};

const CLINICO: PatientSummary = {
  scope: "clinical",
  patient: { ...PACIENTE, treatment_alerts: "Evitar anestesia con adrenalina" },
  background: {
    motivo_consulta: "Dolor molar superior",
    antecedentes_medicos: "Hipertensión controlada",
    alergias: ["Penicilina"],
    medicamentos: [{ nombre: "Losartán", detalle: "50 mg cada 12 horas" }],
    antecedentes_familiares: "Diabetes tipo 2",
    habitos: { fuma: false, alcohol: true },
    embarazo_lactancia: null,
    updated_at: "2026-10-01T10:00:00Z",
  },
  last_encounter: {
    id: "enc-1",
    started_at: "2026-10-02T00:00:00Z",
    care_type: "control",
    motivo: "Control post operatorio",
    diagnostico: "Evolución favorable",
    indicaciones: "Continuar con enjuague sin alcohol",
    proxima_cita_at: "2026-11-15T00:00:00Z",
    status: "signed",
    doctor_name: "Dra. Pérez",
  },
};

const ADMINISTRATIVO: PatientSummary = {
  scope: "administrative",
  patient: PACIENTE,
  background: null,
  last_encounter: null,
};

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(summary: PatientSummary) {
  act(() => {
    root.render(
      <PatientQuickViewDetails
        summary={summary}
        orgName="Clínica Sonrisa"
        timezone="America/Santiago"
      />,
    );
  });
  return container.textContent ?? "";
}

describe("perfil rápido en la agenda", () => {
  it("el equipo clínico ve antecedentes, alertas y última atención", () => {
    const texto = render(CLINICO);

    expect(texto).toContain("Alertas clínicas");
    expect(texto).toContain("Evitar anestesia con adrenalina");
    expect(texto).toContain("Antecedentes");
    expect(texto).toContain("Hipertensión controlada");
    expect(texto).toContain("Penicilina");
    expect(texto).toContain("Losartán");
    expect(texto).toContain("Última atención");
    expect(texto).toContain("Evolución favorable");
    expect(texto).toContain("Ver ficha completa");

    const enlace = container.querySelector('a[href="/dashboard/pacientes/pac-1"]');
    expect(enlace?.textContent).toContain("Ver ficha completa");
  });

  it("la recepción sólo ve datos administrativos", () => {
    const texto = render(ADMINISTRATIVO);

    expect(texto).toContain("11.111.111-1");
    expect(texto).toContain("Contacto");
    expect(texto).toContain("Previsión y emergencia");
    expect(texto).toContain("Fonasa · Tramo B");
    expect(texto).not.toContain("Antecedentes");
    expect(texto).not.toContain("Última atención");
    expect(texto).not.toContain("Alertas clínicas");
    expect(texto).toContain("Ver datos del paciente");
    expect(texto).not.toContain("Ver ficha completa");
    expect(texto).toContain("visible sólo para el equipo clínico");

    const enlace = container.querySelector('a[href="/dashboard/pacientes/pac-1"]');
    expect(enlace?.textContent).toContain("Ver datos del paciente");
  });

  it("sin antecedentes registrados lo informa en vez de dejar el bloque vacío", () => {
    const texto = render({ ...CLINICO, background: null, last_encounter: null });

    expect(texto).toContain("Sin antecedentes registrados.");
    expect(texto).toContain("Sin atenciones registradas.");
  });
});
