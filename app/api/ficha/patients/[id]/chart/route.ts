import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
  orgPatient,
} from "@/lib/ficha/http";
import { chartEntrySchema } from "@/lib/ficha/schemas";
import { toothFaces } from "@/lib/ficha/dental";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { patient, error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const { data, error } = await ctx.supabase
    .from("dental_chart_entries")
    .select("tooth,dentition,face,state,current,recorded_at,encounter_id")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .eq("current", true)
    .order("recorded_at", { ascending: false });

  if (error) return dbError(error);

  return NextResponse.json({ patient, chart: data ?? [] });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const raw = await request.json().catch(() => null);
  const incoming = (Array.isArray(raw) ? raw : raw?.entries);
  if (!Array.isArray(incoming) || !incoming.length) {
    return bodyError({ issues: [{ message: "Indica al menos un diente" }] });
  }

  const items = [];
  for (const item of incoming) {
    const parsed = chartEntrySchema.omit({ patient_id: true, dentition: true }).safeParse(item);
    if (!parsed.success) return bodyError(parsed.error);
    items.push(parsed.data);
  }

  const rows = items.map((item) => ({
    org_id: ctx.session.orgId,
    patient_id: id,
    encounter_id: item.encounter_id ?? null,
    tooth: item.tooth,
    dentition: item.tooth > 48 ? "deciduous" : "permanent",
    face: item.face,
    state: item.state,
    recorded_at: item.recorded_at ? `${item.recorded_at}T00:00:00Z` : new Date().toISOString(),
  }));

  for (const row of rows) {
    if (!toothFaces(row.tooth).includes(row.face)) {
      return bodyError({ issues: [{ message: `Cara inválida para la pieza ${row.tooth}` }] });
    }
  }

  const { data, error } = await ctx.supabase
    .from("dental_chart_entries")
    .insert(rows)
    .select();

  if (error) return dbError(error);

  return NextResponse.json({ chart: data ?? [] }, { status: 201 });
}