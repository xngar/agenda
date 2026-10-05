import "server-only";

import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import type { ClinicSettings } from "@/lib/types";

export interface DoctorSession {
  id: string;
  full_name: string;
  specialty: string | null;
  isAdmin: boolean;
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
    .select("id, full_name, specialty, is_admin, active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !doctor || !doctor.active) return null;

  return {
    id: doctor.id,
    full_name: doctor.full_name,
    specialty: doctor.specialty,
    isAdmin: doctor.is_admin,
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