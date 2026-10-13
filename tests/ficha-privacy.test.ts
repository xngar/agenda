import { describe, expect, it } from "vitest";
import type { DoctorSession } from "@/lib/auth";
import {
  puedeVerNotasPrivadas,
  redactEncounter,
  redactEncounters,
  redactVersion,
} from "@/lib/ficha/privacy";

function sesion(partial: Partial<DoctorSession> = {}): DoctorSession {
  return {
    orgId: "org-1",
    orgSlug: "clinica",
    orgType: "psychological",
    id: "doc-tratante",
    full_name: "Psicóloga",
    specialty: null,
    role: "professional",
    isAdmin: false,
    isSuperAdmin: false,
    ...partial,
  } as DoctorSession;
}

const ATENCION = {
  id: "enc-1",
  doctor_id: "doc-tratante",
  specialty_data: { currentState: "Estable", privateNotes: "Hipótesis reservada" },
};

describe("privacidad de notas privadas", () => {
  it("el tratante y el admin ven las notas privadas", () => {
    expect(puedeVerNotasPrivadas(sesion(), "doc-tratante")).toBe(true);
    expect(puedeVerNotasPrivadas(sesion({ id: "otro", isAdmin: true }), "doc-tratante")).toBe(true);
  });

  it("otro profesional no las ve aunque sea de la misma clínica", () => {
    expect(puedeVerNotasPrivadas(sesion({ id: "doc-otro" }), "doc-tratante")).toBe(false);
  });

  it("redactEncounter quita privateNotes pero conserva el resto", () => {
    const redactada = redactEncounter({ ...ATENCION }, sesion({ id: "doc-otro" }));
    expect(redactada.specialty_data).toEqual({ currentState: "Estable" });
    expect("privateNotes" in (redactada.specialty_data as Record<string, unknown>)).toBe(false);
  });

  it("redactEncounter no toca nada para el tratante", () => {
    expect(redactEncounter({ ...ATENCION }, sesion())).toEqual(ATENCION);
  });

  it("redactEncounters procesa la lista completa", () => {
    const lista = redactEncounters(
      [{ ...ATENCION }, { ...ATENCION, id: "enc-2", doctor_id: "doc-otro" }],
      sesion(),
    );
    expect(lista[0].specialty_data).toEqual(ATENCION.specialty_data);
    expect(lista[1].specialty_data).toEqual({ currentState: "Estable" });
  });

  it("redactVersion limpia el snapshot sin tocar el resto de la versión", () => {
    const version = {
      id: "v-1",
      reason: "Firma de atencion",
      snapshot: { ...ATENCION },
    };
    const redactada = redactVersion(version, sesion({ id: "doc-otro" }));
    expect((redactada.snapshot as Record<string, unknown>).specialty_data).toEqual({
      currentState: "Estable",
    });
    expect(redactada.reason).toBe("Firma de atencion");
  });
});
