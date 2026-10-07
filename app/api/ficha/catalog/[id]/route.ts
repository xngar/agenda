import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  bodyError,
  dbError,
} from "@/lib/ficha/http";
import { catalogItemSchema } from "@/lib/ficha/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden("Sólo el administrador gestiona el catálogo");
  if (!ctx.session.isAdmin) return forbidden();

  const { id } = await params;
  const raw = await request.json().catch(() => null);
  const body = catalogItemSchema.safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const { data, error } = await ctx.supabase
    .from("dental_treatments_catalog")
    .update(body.data)
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return dbError(error);
  if (!data) return notFound("Tratamiento no encontrado");

  return NextResponse.json({ item: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();
  if (!ctx.session.isAdmin) return forbidden("Sólo el administrador gestiona el catálogo");

  const { id } = await params;
  const { data, error } = await ctx.supabase
    .from("dental_treatments_catalog")
    .delete()
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return dbError(error);
  if (!data) return notFound("Tratamiento no encontrado");

  return NextResponse.json({ ok: true });
}