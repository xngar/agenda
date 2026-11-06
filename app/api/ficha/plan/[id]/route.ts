import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  bodyError,
  dbError,
  orgPatient,
} from "@/lib/ficha/http";
import { treatmentPlanPatchSchema } from "@/lib/ficha/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const raw = await request.json().catch(() => null);
  const body = treatmentPlanPatchSchema.safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const { data: item, error: itemError } = await ctx.supabase
    .from("dental_treatment_plan_items")
    .select("patient_id")
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();
  if (itemError) return dbError(itemError);
  if (!item) return notFound("Ítem del plan no encontrado");

  const { error: accessError } = await orgPatient(ctx, item.patient_id);
  if (accessError) return accessError;

  const patch: Record<string, unknown> = { ...body.data };
  if (body.data.approved === true) {
    patch.approved_at = new Date().toISOString();
  } else if (body.data.approved === false) {
    patch.approved_at = null;
  }

  const { data, error } = await ctx.supabase
    .from("dental_treatment_plan_items")
    .update(patch)
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return dbError(error);
  if (!data) return notFound("Ítem del plan no encontrado");

  return NextResponse.json({ item: data });
}