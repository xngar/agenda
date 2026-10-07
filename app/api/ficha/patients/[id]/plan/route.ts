import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
  orgPatient,
} from "@/lib/ficha/http";
import { treatmentPlanItemSchema } from "@/lib/ficha/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { patient, error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const { data, error } = await ctx.supabase
    .from("dental_treatment_plan_items")
    .select("*, dental_treatments_catalog (name)")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .order("priority", { ascending: true, nullsFirst: false });

  if (error) return dbError(error);

  return NextResponse.json({ patient, items: data ?? [] });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const raw = await request.json().catch(() => null);
  const incoming = Array.isArray(raw) ? raw : [raw];
  const items = [];
  for (const item of incoming) {
    const parsed = treatmentPlanItemSchema.omit({ patient_id: true }).safeParse(item);
    if (!parsed.success) return bodyError(parsed.error);
    items.push(parsed.data);
  }

  if (!items.length) return bodyError({ issues: [{ message: "Indica al menos un ítem del plan" }] });

  const rows = items.map((item) => ({
    org_id: ctx.session.orgId,
    patient_id: id,
    encounter_id: item.encounter_id ?? null,
    tooth: item.tooth ?? null,
    faces: item.faces ?? null,
    treatment_id: item.treatment_id ?? null,
    description: item.description ?? null,
    priority: item.priority ?? null,
    stage: item.stage ?? null,
    value: item.value,
    status: item.status ?? "pendiente",
    created_by: ctx.session.id,
  }));

  const { data, error } = await ctx.supabase
    .from("dental_treatment_plan_items")
    .insert(rows)
    .select();

  if (error) return dbError(error);

  return NextResponse.json({ items: data ?? [] }, { status: 201 });
}