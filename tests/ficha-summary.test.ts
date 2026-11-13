import { describe, expect, it } from "vitest";
import type { DoctorSession } from "@/lib/auth";
import type { FichaContext } from "@/lib/ficha/http";
import { patientSummary } from "@/lib/ficha/summary";

type Row = Record<string, unknown>;

interface FakeTables {
  patients?: Row[];
  patient_medical_background?: Row[];
  encounters?: Row[];
  appointments?: Row[];
}

interface FakeCounts {
  appointments?: number;
  encounters?: number;
}

interface FakeQuery {
  select: () => FakeQuery;
  eq: (key: string, value: unknown) => FakeQuery;
  order: () => FakeQuery;
  limit: () => FakeQuery;
  maybeSingle: () => Promise<{ data: Row | null; error: null }>;
  then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
}

function fakeContext(
  session: DoctorSession,
  tables: FakeTables,
  counts: FakeCounts = {},
) {
  const audits: string[] = [];

  function query(table: keyof FakeTables): FakeQuery {
    const filters: Record<string, unknown> = {};
    const chain: FakeQuery = {
      select: () => chain,
      eq: (key, value) => {
        filters[key] = value;
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => {
        const rows = tables[table] ?? [];
        const row = rows.find((item) =>
          Object.entries(filters).every(([key, value]) => item[key] === value),
        );
        return { data: row ?? null, error: null };
      },
      then: (resolve) => {
        if (table === "encounters") {
          return Promise.resolve({
            count: counts.encounters ?? 0,
            error: null,
          }).then(resolve);
        }
        if (table === "appointments") {
          return Promise.resolve({
            count: counts.appointments ?? 0,
            error: null,
          }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    };
    return chain;
  }

  const supabase = {
    from: (table: keyof FakeTables) => query(table),
    rpc: async (_name: string, params: { p_entity?: string }) => {
      if (params.p_entity) audits.push(params.p_entity);
      return { data: null, error: null };
    },
  };

  const context = {
    session,
    supabase,
    clinical: session.role === "professional" || session.isAdmin,
  } as unknown as FichaContext;

  return { context, audits };
}

function sesion(partial: Partial<DoctorSession> = {}): DoctorSession {
  return {
    orgId: "org-1",
    orgSlug: "clinica",
    orgType: "dental",
    id: "doc-1",
    full_name: "Profesional",
    specialty: null,
    role: "professional",
    isAdmin: false,
    isSuperAdmin: false,
    ...partial,
  } as DoctorSession;
}

const PACIENTE: Row = {
  id: "pac-1",
  org_id: "org-1",
  doctor_id: "doc-1",
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
  specialty_profile: { treatmentAlerts: "Evitar anestesia con adrenalina" },
  doctors: { full_name: "Dra. Pérez" },
};

const ANTECEDENTES: Row = {
  org_id: "org-1",
  patient_id: "pac-1",
  motivo_consulta: "Dolor molar superior",
  antecedentes_medicos: "Hipertensión controlada",
  alergias: ["Penicilina", "Látex"],
  medicamentos: [{ nombre: "Losartán", detalle: "50 mg cada 12 horas" }],
  antecedentes_familiares: "Diabetes tipo 2",
  habitos: { fuma: false, alcohol: true, ejercicio: true },
  embarazo_lactancia: null,
  updated_at: "2026-10-01T10:00:00Z",
};

const ATENCION: Row = {
  id: "enc-1",
  org_id: "org-1",
  patient_id: "pac-1",
  doctor_id: "doc-1",
  started_at: "2026-10-02T00:00:00Z",
  care_type: "control",
  motivo: "Control post operatorio",
  diagnostico: "Evolución favorable",
  indicaciones: "Continuar con enjuague sin alcohol",
  proxima_cita_at: "2026-11-15T00:00:00Z",
  status: "signed",
  doctors: { full_name: "Dra. Pérez" },
};

describe("resumen de paciente para la agenda", () => {
  it("entrega datos clínicos completos al profesional con vínculo", async () => {
    const { context, audits } = fakeContext(sesion(), {
      patients: [PACIENTE],
      patient_medical_background: [ANTECEDENTES],
      encounters: [ATENCION],
    });

    const { summary, error } = await patientSummary(context, "pac-1");

    expect(error).toBeNull();
    expect(summary?.scope).toBe("clinical");
    expect(summary?.patient.full_name).toBe("Ana Soto");
    expect(summary?.patient.treatment_alerts).toBe("Evitar anestesia con adrenalina");
    expect(summary?.patient.doctor_name).toBe("Dra. Pérez");
    expect(summary?.background?.alergias).toEqual(["Penicilina", "Látex"]);
    expect(summary?.background?.medicamentos).toEqual([
      { nombre: "Losartán", detalle: "50 mg cada 12 horas" },
    ]);
    expect(summary?.last_encounter?.diagnostico).toBe("Evolución favorable");
    expect(summary?.last_encounter?.status).toBe("signed");
    expect(audits).toEqual(["patients", "patient_background", "encounters"]);
  });

  it("devuelve el resumen clínico aunque no haya antecedentes ni atenciones", async () => {
    const { context, audits } = fakeContext(sesion({ isAdmin: true }), {
      patients: [{ ...PACIENTE, specialty_profile: null }],
    });

    const { summary, error } = await patientSummary(context, "pac-1");

    expect(error).toBeNull();
    expect(summary?.scope).toBe("clinical");
    expect(summary?.background).toBeNull();
    expect(summary?.last_encounter).toBeNull();
    expect(summary?.patient.treatment_alerts).toBeNull();
    expect(audits).toEqual(["patients", "patient_background"]);
  });

  it("la recepción recibe sólo datos administrativos y sin auditoría clínica", async () => {
    const { context, audits } = fakeContext(
      sesion({ id: "recep-1", role: "reception" }),
      { patients: [PACIENTE] },
    );

    const { summary, error } = await patientSummary(context, "pac-1");

    expect(error).toBeNull();
    expect(summary?.scope).toBe("administrative");
    expect(summary?.patient.full_name).toBe("Ana Soto");
    expect(summary?.background).toBeNull();
    expect(summary?.last_encounter).toBeNull();
    expect(summary?.patient.treatment_alerts).toBeNull();
    expect(audits).toEqual([]);
  });

  it("oculta la ficha a un profesional sin relación con la atención", async () => {
    const { context } = fakeContext(
      sesion({ id: "doc-3" }),
      { patients: [{ ...PACIENTE, doctor_id: "doc-1" }] },
      { appointments: 0, encounters: 0 },
    );

    const { summary, error } = await patientSummary(context, "pac-1");

    expect(summary).toBeNull();
    expect(error?.status).toBe(403);
  });

  it("devuelve 404 cuando el paciente no existe en la organización", async () => {
    const { context } = fakeContext(sesion({ role: "reception" }), { patients: [] });

    const { summary, error } = await patientSummary(context, "pac-inexistente");

    expect(summary).toBeNull();
    expect(error?.status).toBe(404);
  });
});
