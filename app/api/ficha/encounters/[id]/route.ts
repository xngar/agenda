import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  bodyError,
  dbError,
} from "@/lib/ficha/http";
import { encounterSchema } from "@/lib/ficha/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const raw = await request.json().catch(() => null);
  const body = encounterSchema.omit({ patient_id: true, started_at: true }).safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const { data, error } = await ctx.supabase
    .from("encounters")
    .update({
      ...body.data,
      specialty_data: body.data.specialty_data ?? {},
    })
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return dbError(error);
  if (!data) return notFound("Atención no encontrada o ya fue firmada");

  return NextResponse.json({ encounter: data });
}

export async function POST(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;

  const { data, error } = await ctx.supabase
    .from("encounters")
    .update({ status: "signed" })
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .eq("status", "draft")
    .select()
    .maybeSingle();

  if (error) return dbError(error);
  if (!data) return notFound("Atención no encontrada o ya firmada");

  return NextResponse.json({ encounter: data });
}