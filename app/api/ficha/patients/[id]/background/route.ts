import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
  orgPatient,
} from "@/lib/ficha/http";
import { backgroundSchema } from "@/lib/ficha/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { patient, error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const { data, error } = await ctx.supabase
    .from("patient_medical_background")
    .select("*")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .maybeSingle();

  if (error) return dbError(error);

  return NextResponse.json({ patient, background: data ?? null });
}

export async function PUT(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const raw = await request.json().catch(() => null);
  const body = backgroundSchema.safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const { data: existe } = await ctx.supabase
    .from("patient_medical_background")
    .select("id")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .maybeSingle();

  const fields = {
    org_id: ctx.session.orgId,
    patient_id: id,
    updated_by: ctx.session.id,
    motivo_consulta: body.data.motivo_consulta ?? null,
    antecedentes_medicos: body.data.antecedentes_medicos ?? null,
    medicamentos: body.data.medicamentos ?? [],
    alergias: body.data.alergias ?? [],
    antecedentes_familiares: body.data.antecedentes_familiares ?? null,
    habitos: body.data.habitos ?? {},
    embarazo_lactancia: body.data.embarazo_lactancia ?? null,
  };

  let result;
  if (existe) {
    result = await ctx.supabase
      .from("patient_medical_background")
      .update(fields)
      .eq("org_id", ctx.session.orgId)
      .eq("patient_id", id)
      .select()
      .single();
  } else {
    result = await ctx.supabase
      .from("patient_medical_background")
      .insert(fields)
      .select()
      .single();
  }

  if (result.error) return dbError(result.error);

  return NextResponse.json({ background: result.data });
}