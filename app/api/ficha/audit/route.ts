import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
} from "@/lib/ficha/http";
import { auditQuerySchema } from "@/lib/ficha/schemas";

export async function GET(request: Request) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.session.isAdmin && !ctx.session.isSuperAdmin) return forbidden("Sólo el administrador ve la auditoría");

  const { searchParams } = new URL(request.url);
  const body = auditQuerySchema.safeParse({
    entity: searchParams.get("entity") ?? undefined,
    entity_id: searchParams.get("entity_id") ?? undefined,
    limit: searchParams.get("limit") ?? 50,
  });
  if (!body.success) return bodyError(body.error);

  let query = ctx.supabase
    .from("audit_log")
    .select("*")
    .eq("org_id", ctx.session.orgId)
    .order("created_at", { ascending: false })
    .limit(body.data.limit);

  if (body.data.entity) query = query.eq("entity", body.data.entity);
  if (body.data.entity_id) query = query.eq("entity_id", body.data.entity_id);

  const { data, error } = await query;
  if (error) return dbError(error);

  return NextResponse.json({ entries: data ?? [] });
}