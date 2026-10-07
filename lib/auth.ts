import "server-only";

import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import type { ClinicSettings } from "@/lib/types";
import type { DoctorRole, OrganizationType } from "@/lib/ficha/types";

export interface DoctorSession {
  orgId: string;
  orgSlug: string;
  orgType: OrganizationType;
  id: string;
full_name: string;
  specialty: string | null;
  role: DoctorRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

/** La relaci�n `organizations` puede venir como objeto o como arreglo. */
function orgSlugOf(relation: unknown): string {
  if (Array.isArray(relation)) return (relation[0]?.slug as string | undefined) ?? "";
  return ((relation as { slug?: string } | null)?.slug as string | undefined) ?? "";
}

function orgTypeOf(relation: unknown): OrganizationType {
  const type = Array.isArray(relation)
    ? (relation[0]?.type as OrganizationType | undefined)
    : ((relation as { type?: OrganizationType } | null)?.type as OrganizationType | undefined);
  return type === "medical" || type === "psychological" ? type : "dental";
}

/**
 * Verificación REAL de sesión + rol, en el servidor.
 *
 * El `proxy.ts` sólo hace un chequeo optimista del cookie (rápido, sin
 * red). La autoridad es esta función: sin `doctors` no hay sesión, con
 * `active = false` tampoco, y `is_admin` se lee de la base, no de un
 * claim del token.
 */
export async function getDoctorSession(): Promise<DoctorSession | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

const { data: doctor, error } = await supabase
    .from("doctors")
    .select("id, full_name, specialty, is_admin, is_super_admin, active, role, org_id, organizations!doctors_org_id_fkey (slug, type)")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !doctor || !doctor.active) return null;

  return {
    id: doctor.id,
    full_name: doctor.full_name,
    specialty: doctor.specialty,
isAdmin: doctor.is_admin,
    isSuperAdmin: doctor.is_super_admin,
    orgId: doctor.org_id,
orgSlug: orgSlugOf(doctor.organizations),
    orgType: orgTypeOf(doctor.organizations),
    role: doctor.role === "reception" ? "reception" : "professional",
  };
}

export async function requireDoctor(): Promise<DoctorSession> {
  const session = await getDoctorSession();
  if (!session) redirect("/dashboard/login");
  return session;
}

export async function requireAdmin(): Promise<DoctorSession> {
  const session = await requireDoctor();
  if (!session.isAdmin) redirect("/dashboard");
  return session;
}

export async function getOrgSettings(orgId: string): Promise<ClinicSettings> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("organizations").select("*").eq("id", orgId).single();

  if (!data) {
    throw new Error("organizacion sin configuracion; revisa el org_id del profesional");
  }
  return data as ClinicSettings;
}




export async function requireSuperAdmin(): Promise<DoctorSession> {
  const session = await requireDoctor();
  if (!session.isSuperAdmin) redirect("/dashboard");
  return session;
}

export function isClinical(session: DoctorSession): boolean {
  return session.isSuperAdmin || session.role === "professional" || session.isAdmin;
}
