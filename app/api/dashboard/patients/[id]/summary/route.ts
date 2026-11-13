import { NextResponse } from "next/server";
import { fichaContext, forbidden, unauthorized } from "@/lib/ficha/http";
import { patientSummary } from "@/lib/ficha/summary";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical && ctx.session.role !== "reception") return forbidden();

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  const { summary, error } = await patientSummary(ctx, id);
  if (error) return error;

  return NextResponse.json({ summary });
}
