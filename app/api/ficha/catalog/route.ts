import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
} from "@/lib/ficha/http";
import { catalogItemSchema } from "@/lib/ficha/schemas";

export async function GET() {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { data, error } = await ctx.supabase
    .from("dental_treatments_catalog")
    .select("*")
    .eq("org_id", ctx.session.orgId)
    .order("name");

  if (error) return dbError(error);

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();
  if (!ctx.session.isAdmin) return forbidden("Sólo el administrador gestiona el catálogo");

  const raw = await request.json().catch(() => null);
  const body = catalogItemSchema.safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const { data, error } = await ctx.supabase
    .from("dental_treatments_catalog")
    .insert({
      org_id: ctx.session.orgId,
      name: body.data.name,
      default_value: body.data.default_value,
      active: body.data.active ?? true,
      created_by: ctx.session.id,
    })
    .select()
    .single();

  if (error) return dbError(error);

  return NextResponse.json({ item: data }, { status: 201 });
}