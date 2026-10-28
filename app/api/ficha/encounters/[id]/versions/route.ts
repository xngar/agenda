import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  bodyError,
  dbError,
  auditPatientView,
} from "@/lib/ficha/http";
import { versionSchema } from "@/lib/ficha/schemas";
import { redactVersions } from "@/lib/ficha/privacy";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { data: encounter, error: encounterError } = await ctx.supabase
    .from("encounters")
    .select("patient_id")
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();
  if (encounterError) return dbError(encounterError);
  if (!encounter) return notFound("Atención no encontrada");

  const { data, error } = await ctx.supabase
    .from("encounter_versions")
    .select("*, doctors!encounter_versions_author_id_fkey (full_name)")
    .eq("org_id", ctx.session.orgId)
    .eq("encounter_id", id)
    .order("created_at", { ascending: false });

  if (error) return dbError(error);
  const auditError = await auditPatientView(ctx, encounter.patient_id, "encounter_versions");
  if (auditError) return auditError;

  return NextResponse.json({
    versions: redactVersions((data ?? []) as unknown as Record<string, unknown>[], ctx.session),
  });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const raw = await request.json().catch(() => null);
  const body = versionSchema.safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const { data: encounter, error: encError } = await ctx.supabase
    .from("encounters")
    .select("*")
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();
  if (encError) return dbError(encError);
  if (!encounter) return notFound("Atención no encontrada");

  const { data, error } = await ctx.supabase
    .from("encounter_versions")
    .insert({
      org_id: ctx.session.orgId,
      patient_id: encounter.patient_id as string,
      encounter_id: id,
      author_id: ctx.session.id,
      reason: body.data.reason,
      snapshot: encounter,
    })
    .select()
    .single();

  if (error) return dbError(error);

  return NextResponse.json({ version: data }, { status: 201 });
}