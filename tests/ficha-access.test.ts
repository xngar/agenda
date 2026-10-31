import { describe, expect, it } from "vitest";
import type { DoctorSession } from "@/lib/auth";
import { patientAccess, type FichaContext } from "@/lib/ficha/http";

function sesion(partial: Partial<DoctorSession> = {}): DoctorSession {
  return {
    orgId: "org-1",
    orgSlug: "clinica",
    orgType: "medical",
    id: "doc-1",
    full_name: "Profesional",
    specialty: null,
    role: "professional",
    isAdmin: false,
    isSuperAdmin: false,
    ...partial,
  } as DoctorSession;
}

function contexto(
  session: DoctorSession,
  counts: { appointments?: number; encounters?: number } = {},
): FichaContext {
  const supabase = {
    from(table: string) {
      const query = {
        select: () => query,
        eq: () => query,
        then: (resolve: (value: { count: number; error: null }) => unknown) =>
          resolve({
            count:
              table === "appointments"
                ? counts.appointments ?? 0
                : counts.encounters ?? 0,
            error: null,
          }),
      };
      return query;
    },
  };
  return { session, supabase, clinical: true } as unknown as FichaContext;
}

const PACIENTE = { id: "pac-1", org_id: "org-1", doctor_id: "doc-1" };

describe("permisos de ficha por relación con la atención", () => {
  it("el admin ve y edita todo", async () => {
    const access = await patientAccess(contexto(sesion({ isAdmin: true })), PACIENTE);
    expect(access.canViewClinical).toBe(true);
    expect(access.canEditIdentity).toBe(true);
    expect(access.canEditClinical).toBe(true);
    expect(access.canDelete).toBe(true);
    expect(access.canViewAudit).toBe(true);
  });

  it("la recepción sólo administra identidad y contacto", async () => {
    const access = await patientAccess(
      contexto(sesion({ role: "reception", id: "recep-1" })),
      { ...PACIENTE, doctor_id: "doc-1" },
    );
    expect(access.isReception).toBe(true);
    expect(access.canViewClinical).toBe(false);
    expect(access.canEditIdentity).toBe(true);
    expect(access.canEditClinical).toBe(false);
    expect(access.canDelete).toBe(false);
    expect(access.canViewAudit).toBe(false);
  });

  it("el tratante principal puede ver, editar y archivar", async () => {
    const access = await patientAccess(contexto(sesion()), PACIENTE);
    expect(access.linked).toBe(true);
    expect(access.canViewClinical).toBe(true);
    expect(access.canDelete).toBe(true);
    expect(access.canViewAudit).toBe(true);
  });

  it("otro profesional con una cita puede ver pero no archivar ni auditar", async () => {
    const access = await patientAccess(
      contexto(sesion({ id: "doc-2" }), { appointments: 1 }),
      PACIENTE,
    );
    expect(access.linked).toBe(true);
    expect(access.canViewClinical).toBe(true);
    expect(access.canEditClinical).toBe(true);
    expect(access.canDelete).toBe(false);
    expect(access.canViewAudit).toBe(false);
  });

  it("otro profesional con una atención puede ver el historial", async () => {
    const access = await patientAccess(
      contexto(sesion({ id: "doc-2" }), { encounters: 1 }),
      PACIENTE,
    );
    expect(access.canViewClinical).toBe(true);
    expect(access.canDelete).toBe(false);
  });

  it("un profesional sin vínculo asistencial no accede a la ficha", async () => {
    const access = await patientAccess(
      contexto(sesion({ id: "doc-3" })),
      PACIENTE,
    );
    expect(access.linked).toBe(false);
    expect(access.canViewClinical).toBe(false);
    expect(access.canEditIdentity).toBe(false);
    expect(access.canEditClinical).toBe(false);
    expect(access.canDelete).toBe(false);
    expect(access.canViewAudit).toBe(false);
  });
});
