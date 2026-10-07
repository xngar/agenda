import { NextResponse } from "next/server";
import { z } from "zod";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
  orgPatient,
} from "@/lib/ficha/http";
import { attachmentSchema } from "@/lib/ficha/schemas";

const attachmentRecordSchema = attachmentSchema
  .omit({ patient_id: true })
  .extend({
    storage_path: z.string().trim().min(1, "Falta la ruta del archivo").max(512),
    file_name: z.string().trim().max(255).nullable().optional(),
    mime: z.string().trim().max(120).nullable().optional(),
    size_bytes: z.number().int().min(0).nullable().optional(),
  });

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { patient, error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const { data, error } = await ctx.supabase
    .from("attachments")
    .select("*")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  if (error) return dbError(error);

  return NextResponse.json({ patient, attachments: data ?? [] });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const raw = await request.json().catch(() => null);
  const body = attachmentRecordSchema.safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const { data, error } = await ctx.supabase
    .from("attachments")
    .insert({
      org_id: ctx.session.orgId,
      patient_id: id,
      encounter_id: body.data.encounter_id ?? null,
      kind: body.data.kind,
      description: body.data.description ?? null,
      taken_at: body.data.taken_at ? `${body.data.taken_at}T00:00:00Z` : null,
      storage_path: body.data.storage_path,
      file_name: body.data.file_name ?? null,
      mime: body.data.mime ?? null,
      size_bytes: body.data.size_bytes ?? null,
      created_by: ctx.session.id,
    })
    .select()
    .single();

  if (error) return dbError(error);

  return NextResponse.json({ attachment: data }, { status: 201 });
}