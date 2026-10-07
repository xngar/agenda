import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  bodyError,
  dbError,
  conflictMessage,
  orgPatient,
} from "@/lib/ficha/http";
import { patientBaseSchema } from "@/lib/ficha/schemas";

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
    patch.specialty_profile = {
      ...(existe.specialty_profile as Record<string, unknown> | null),
      ...data.specialty_profile,
    };
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

  const { data: dueno } = await ctx.supabase
    .from("patients")
    .select("doctor_id")
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();

  if (!dueno || (dueno.doctor_id !== ctx.session.id && !ctx.session.isAdmin)) {
    return forbidden("Solo el médico dueño del paciente o el administrador puede borrarlo");
  }

  const { error: delError } = await ctx.supabase
    .from("patients")
    .delete()
    .eq("org_id", ctx.session.orgId)
    .eq("id", id);

  if (delError) {
    if (delError.code === "23503") {
      return conflictMessage(
        "Este paciente tiene o tuvo citas; solo se pueden eliminar pacientes sin citas",
        "tiene_citas",
      );
    }
    return dbError(delError);
  }

  return NextResponse.json({ ok: true });
}