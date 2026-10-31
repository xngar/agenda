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
import { validateEncounterData } from "@/lib/ficha/definitions";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const raw = await request.json().catch(() => null);
  const body = encounterSchema.omit({ patient_id: true }).safeParse(raw);
  if (!body.success) return bodyError(body.error);

  // Merge y no reemplazo: el borrador puede no traer campos que otro
  // profesional ya guardó (p. ej. notas privadas), y no deben perderse.
  const { data: previa, error: previaError } = await ctx.supabase
    .from("encounters")
    .select("doctor_id,status,specialty_data")
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();
  if (previaError) return dbError(previaError);
  if (!previa) return notFound("Atención no encontrada");
  if (previa.status === "signed") {
    return NextResponse.json(
      { error: "La atención firmada es inmutable; crea una corrección o addendum" },
      { status: 409 },
    );
  }
  if (previa.doctor_id !== ctx.session.id) {
    return forbidden("Solo el autor puede editar su propio borrador");
  }

  const especialidad = validateEncounterData(ctx.session.orgType, {
    ...((previa.specialty_data as Record<string, unknown> | null) ?? {}),
    ...(body.data.specialty_data ?? {}),
  });
  if (!especialidad.success) return bodyError(especialidad.error);

  const { started_at, ...campos } = body.data;

  const { data, error } = await ctx.supabase
    .from("encounters")
    .update({
      ...campos,
      ...(started_at ? { started_at: `${started_at}T00:00:00Z` } : {}),
      specialty_data: especialidad.data,
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

  const { data: previa, error: previaError } = await ctx.supabase
    .from("encounters")
    .select("doctor_id,status")
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();
  if (previaError) return dbError(previaError);
  if (!previa) return notFound("Atención no encontrada");
  if (previa.status === "signed") return notFound("Atención no encontrada o ya firmada");
  if (previa.doctor_id !== ctx.session.id) {
    return forbidden("Solo el autor puede firmar su atención");
  }

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