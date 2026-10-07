import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
  orgPatient,
} from "@/lib/ficha/http";
import { periodontalSchema } from "@/lib/ficha/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { patient, error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const { data, error } = await ctx.supabase
    .from("periodontal_records")
    .select("*")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .order("recorded_at", { ascending: false });

  if (error) return dbError(error);

  return NextResponse.json({ patient, records: data ?? [] });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const raw = await request.json().catch(() => null);
  const body = periodontalSchema.omit({ patient_id: true }).safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const { data, error } = await ctx.supabase
    .from("periodontal_records")
    .insert({
      org_id: ctx.session.orgId,
      patient_id: id,
      encounter_id: body.data.encounter_id ?? null,
      tooth: body.data.tooth,
      depths: body.data.depths ?? {},
      bleeding_on_probing: body.data.bleeding_on_probing ?? null,
      recession: body.data.recession ?? null,
      mobility: body.data.mobility,
      furcation: body.data.furcation ?? null,
      diagnosis: body.data.diagnosis ?? null,
      recorded_at: body.data.recorded_at ? `${body.data.recorded_at}T00:00:00Z` : undefined,
    })
    .select()
    .single();

  if (error) return dbError(error);

  return NextResponse.json({ record: data }, { status: 201 });
}