import "server-only";

import type { DoctorSession } from "@/lib/auth";

type Fila = Record<string, unknown>;

/**
 * Notas privadas de psicología: sólo el profesional tratante y el admin.
 *
 * Se aplica en cada salida que expone `specialty_data` (lista de atenciones,
 * versiones, export JSON y PDF) para que la restricción no dependa de que
 * cada pantalla se acuerde de ocultar el campo.
 */
export function puedeVerNotasPrivadas(session: DoctorSession, doctorId: unknown): boolean {
  if (session.isAdmin) return true;
  return typeof doctorId === "string" && doctorId === session.id;
}

function sinPrivateNotes(datos: unknown): unknown {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return datos;
  if (!("privateNotes" in datos)) return datos;
  const copia = { ...(datos as Record<string, unknown>) };
  delete copia.privateNotes;
  return copia;
}

export function redactEncounter(encounter: Fila, session: DoctorSession): Fila {
  if (puedeVerNotasPrivadas(session, encounter.doctor_id)) return encounter;
  return { ...encounter, specialty_data: sinPrivateNotes(encounter.specialty_data) };
}

export function redactEncounters(encounters: Fila[], session: DoctorSession): Fila[] {
  return encounters.map((e) => redactEncounter(e, session));
}

export function redactVersion(version: Fila, session: DoctorSession): Fila {
  const snapshot = version.snapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return version;
  return { ...version, snapshot: redactEncounter(snapshot as Fila, session) };
}

export function redactVersions(versions: Fila[], session: DoctorSession): Fila[] {
  return versions.map((v) => redactVersion(v, session));
}
