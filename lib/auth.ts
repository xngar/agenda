import "server-only";

import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import type { ClinicSettings } from "@/lib/types";

export interface DoctorSession {
  orgId: string;
  orgSlug: string;
  id: string;
  full_name: string;
  specialty: string | null;
  isAdmin: boolean;
}

/**
 * VerificaciÃ³n REAL de sesiÃ³n + rol, en el servidor.
 *
 * El `proxy.ts` sÃ³lo hace un chequeo optimista del cookie (rÃ¡pido, sin
 * red). La autoridad es esta funciÃ³n: sin `doctors` no hay sesiÃ³n, con
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
    .select("id, full_name, specialty, is_admin, active, org_id, organizations!doctors_org_id_fkey (slug)")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !doctor || !doctor.active) return null;

  return {
    id: doctor.id,
    full_name: doctor.full_name,
    specialty: doctor.specialty,
    isAdmin: doctor.is_admin,
    orgId: doctor.org_id,
    orgSlug: doctor.organizations?.slug ?? '',
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

export async function getClinicSettings(): Promise<ClinicSettings> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("clinic_settings").select("*").eq("id", 1).single();

  if (!data) {
    throw new Error("clinic_settings sin fila; ejecuta las migraciones de supabase/migrations");
  }
  return data as ClinicSettings;
}




export async function requireSuperAdmin(): Promise<DoctorSession> {
  const session = await requireDoctor();
  const supabase = await supabaseServer();
  const { data: d } = await supabase.from('doctors').select('is_super_admin').eq('id', session.id).maybeSingle();
  if (!d?.is_super_admin) redirect('/dashboard');
  return session;
}
