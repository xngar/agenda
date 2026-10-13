import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  dbError,
} from "@/lib/ficha/http";

type Params = { params: Promise<{ id: string }> };

/** Anular un pago es administrativo: sólo el admin (queda en auditoría). */
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();
  if (!ctx.session.isAdmin) return forbidden("Sólo el administrador puede anular pagos");

  const { id } = await params;
  const { data, error } = await ctx.supabase
    .from("dental_payments")
    .delete()
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .select("id");

  if (error) return dbError(error);
  if (!data || data.length === 0) return notFound("Pago no encontrado");

  return NextResponse.json({ ok: true });
}
