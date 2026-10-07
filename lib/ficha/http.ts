import "server-only";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getDoctorSession, isClinical, type DoctorSession } from "@/lib/auth";

export interface FichaContext {
  session: DoctorSession;
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  clinical: boolean;
}

export async function fichaContext(): Promise<FichaContext | null> {
  const session = await getDoctorSession();
  if (!session) return null;
  const supabase = await supabaseServer();
  return { session, supabase, clinical: isClinical(session) };
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
}

export function forbidden(message = "No tienes acceso a la ficha clínica"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "No encontrado"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function invalid(message = "Revisa los datos"): NextResponse {
  return NextResponse.json({ error: message }, { status: 422 });
}

export function conflictMessage(message: string, code?: string): NextResponse {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status: 409 });
}

export function bodyError(error: { issues?: { message?: string }[] }): NextResponse {
  return invalid(error.issues?.[0]?.message ?? "Revisa los datos");
}

export function dbError(error: { message?: string; code?: string }): NextResponse {
  if (error.code === "23505") {
    return conflictMessage("Ese dato ya existe (revisa RUT, correo o nombre repetido)", "duplicado");
  }
  if (error.code === "EFIRM") {
    return conflictMessage("La ficha firmada es inmutable; crea una corrección", "ficha_firmada");
  }
  return NextResponse.json({ error: "No se pudo completar la operación" }, { status: 500 });
}

export async function orgPatient(
  ctx: FichaContext,
  patientId: string,
): Promise<{ patient: { id: string; org_id: string } | null; error: NextResponse | null }> {
  const { data, error } = await ctx.supabase
    .from("patients")
    .select("id,org_id")
    .eq("org_id", ctx.session.orgId)
    .eq("id", patientId)
    .maybeSingle();

  if (error) return { patient: null, error: dbError(error) };
  if (!data) return { patient: null, error: notFound("Paciente no encontrado") };
  return { patient: data, error: null };
}