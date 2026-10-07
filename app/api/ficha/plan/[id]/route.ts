import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  bodyError,
  dbError,
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

  const patch: Record<string, unknown> = { ...body.data };
  if (body.data.approved) patch.approved_at = new Date().toISOString();

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