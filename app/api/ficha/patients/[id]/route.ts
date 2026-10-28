import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  bodyError,
  dbError,
  orgPatient,
  auditPatientView,
} from "@/lib/ficha/http";
import { patientBaseSchema } from "@/lib/ficha/schemas";
import { validateProfile } from "@/lib/ficha/definitions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;

  const { data: patient, error } = await ctx.supabase
    .from("patients")
    .select("*, doctors (full_name), patient_medical_background (*)")
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();

  if (error) return dbError(error);
  if (!patient) return notFound("Paciente no encontrado");
  const auditError = await auditPatientView(ctx, id, "patients");
  if (auditError) return auditError;

  return NextResponse.json({ patient });
}

export async function PUT(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const raw = await request.json().catch(() => null);
  const body = patientBaseSchema.safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const { data: existe, error: existeError } = await ctx.supabase
    .from("patients")
    .select("id,full_name,nombres,apellido_paterno,apellido_materno,specialty_profile,doctor_id")
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();
  if (existeError) return dbError(existeError);
  if (!existe) return notFound("Paciente no encontrado");

  if (existe.doctor_id !== ctx.session.id && !ctx.session.isAdmin) {
    return forbidden("Solo el médico dueño del paciente o el administrador puede editarlo");
  }

  const data = body.data;
  const patch: Record<string, unknown> = { ...data };

  if (data.specialty_profile) {
    const perfil = validateProfile(ctx.session.orgType, {
      ...((existe.specialty_profile as Record<string, unknown> | null) ?? {}),
      ...data.specialty_profile,
    });
    if (!perfil.success) return bodyError(perfil.error);
    patch.specialty_profile = perfil.data;
  }

  if (data.full_name === undefined && (data.nombres || data.apellido_paterno || data.apellido_materno)) {
    patch.full_name =
      [data.nombres ?? existe.nombres, data.apellido_paterno ?? existe.apellido_paterno, data.apellido_materno ?? existe.apellido_materno]
        .filter(Boolean)
        .join(" ")
        .trim();
  }

  const { data: actualizado, error } = await ctx.supabase
    .from("patients")
    .update(patch)
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return dbError(error);

  return NextResponse.json({ patient: actualizado });
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;

  const { patient, error } = await orgPatient(ctx, id);
  if (error) return error;

  if (!patient) return notFound("Paciente no encontrado");

  const { data: dueno, error: duenoError } = await ctx.supabase
    .from("patients")
    .select("doctor_id")
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();

  if (duenoError) return dbError(duenoError);
  if (!dueno || (dueno.doctor_id !== ctx.session.id && !ctx.session.isAdmin)) {
    return forbidden("Solo el médico dueño del paciente o el administrador puede archivarlo");
  }

  const { data: actualizado, error: updateError } = await ctx.supabase
    .from("patients")
    .update({ patient_status: "inactive" })
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (updateError) return dbError(updateError);
  if (!actualizado) return notFound("Paciente no encontrado");

  return NextResponse.json({ ok: true, archived: true });
}