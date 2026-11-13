import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextPatientCard } from "@/components/dashboard/next-patient-card";
import { clearPatientSummaryCache } from "@/components/dashboard/patient-quick-view";
import type { DoctorAppointment } from "@/lib/types";
import type { PatientSummary } from "@/lib/ficha/summary-types";

let root: Root;
let container: HTMLDivElement;

const CITAS: DoctorAppointment[] = [
  {
    id: "appt-1",
    doctor_id: "doc-1",
    patient_id: "pac-1",
    service_id: "srv-1",
    during: {
      start: "2099-05-10T10:00:00-04:00",
      end: "2099-05-10T10:30:00-04:00",
    },
    status: "confirmed",
    cancelled_by: null,
    cancel_reason: null,
    created_at: "2099-05-01T12:00:00Z",
    rescheduled_at: null,
    patient: {
      full_name: "Ana Soto",
      phone: "+56911111111",
      email: "ana@correo.cl",
      rut: "11111111-1",
    },
    service: { name: "Control general", duration_min: 30 },
  },
];

const CLINICAL_SUMMARY: PatientSummary = {
  scope: "clinical",
  patient: {
    id: "pac-1",
    full_name: "Ana Soto",
    rut: "11111111-1",
    phone: "+56911111111",
    email: "ana@correo.cl",
    birth_date: "1990-04-02",
    sex: "female",
    patient_status: "active",
    prevision_type: "Fonasa",
    fonasa_tramo: "B",
    isapre_name: null,
    isapre_plan: null,
    address: null,
    comuna: null,
    emergency_name: null,
    emergency_relation: null,
    emergency_phone: null,
    tutor_name: null,
    tutor_relation: null,
    tutor_phone: null,
    admitted_at: null,
    doctor_name: "Dra. Morales",
    treatment_alerts: "Alergia severa a látex",
  },
  background: {
    motivo_consulta: "Control preventivo",
    antecedentes_medicos: null,
    alergias: ["Penicilina"],
    medicamentos: [{ nombre: "Losartán", detalle: "50 mg" }],
    antecedentes_familiares: null,
    habitos: {},
    embarazo_lactancia: null,
    updated_at: null,
  },
  last_encounter: {
    id: "enc-1",
    started_at: "2026-09-15T00:00:00Z",
    care_type: "control",
    motivo: "Limpieza",
    diagnostico: "Encías sanas",
    indicaciones: null,
    proxima_cita_at: null,
    status: "signed",
    doctor_name: "Dra. Morales",
  },
};

const ADMIN_SUMMARY: PatientSummary = {
  scope: "administrative",
  patient: { ...CLINICAL_SUMMARY.patient, treatment_alerts: null },
  background: null,
  last_encounter: null,
};

beforeEach(() => {
  clearPatientSummaryCache();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe("NextPatientCard", () => {
  it("muestra alertas, alergias, fármacos y última atención para el equipo clínico", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ summary: CLINICAL_SUMMARY }),
      }),
    );

    act(() => {
      root.render(
        <NextPatientCard
          citas={CITAS}
          dayKey="2099-05-10"
          todayKey="2099-05-10"
          timezone="America/Santiago"
        />,
      );
    });
    await flush();

    expect(container.textContent).toContain("Próximo paciente a atender");
    expect(container.textContent).toContain("Ana Soto");
    expect(container.textContent).toContain("Alergia severa a látex");
    expect(container.textContent).toContain("Penicilina");
    expect(container.textContent).toContain("Losartán");
    expect(container.textContent).toContain("Encías sanas");
    expect(container.textContent).toContain("Abrir ficha clínica");
  });

  it("oculta bloques clínicos cuando el rol es recepción (scope administrative)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ summary: ADMIN_SUMMARY }),
      }),
    );

    act(() => {
      root.render(
        <NextPatientCard
          citas={CITAS}
          dayKey="2099-05-10"
          todayKey="2099-05-10"
          timezone="America/Santiago"
        />,
      );
    });
    await flush();

    expect(container.textContent).toContain("Ana Soto");
    expect(container.textContent).toContain("Datos de contacto");
    expect(container.textContent).not.toContain("Alertas y alergias");
    expect(container.textContent).not.toContain("Abrir ficha clínica");
  });
});
