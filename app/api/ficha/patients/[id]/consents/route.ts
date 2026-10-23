import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
  orgPatient,
  auditPatientView,
} from "@/lib/ficha/http";
import { consentAcceptanceSchema } from "@/lib/ficha/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { patient, error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const { data, error } = await ctx.supabase
    .from("consents")
    .select("*, evidence_attachment:attachments!consents_evidence_attachment_id_fkey(id,file_name)")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .order("accepted_at", { ascending: false });

  if (error) return dbError(error);
  const auditError = await auditPatientView(ctx, id, "consents");
  if (auditError) return auditError;

  return NextResponse.json({ patient, consents: data ?? [] });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const raw = await request.json().catch(() => null);
  const body = consentAcceptanceSchema.safeParse(raw);
  if (!body.success) return bodyError(body.error);

  if (body.data.evidence_attachment_id) {
    const { data: attachment, error: attachmentError } = await ctx.supabase
      .from("attachments")
      .select("id")
      .eq("id", body.data.evidence_attachment_id)
      .eq("org_id", ctx.session.orgId)
      .eq("patient_id", id)
      .eq("kind", "consentimiento")
      .maybeSingle();

    if (attachmentError) return dbError(attachmentError);
    if (!attachment) {
      return NextResponse.json(
        { error: "El respaldo debe ser un adjunto de consentimiento de este paciente." },
        { status: 400 },
      );
    }
  }

  const { data, error } = await ctx.supabase
    .from("consents")
    .insert({
      org_id: ctx.session.orgId,
      patient_id: id,
      encounter_id: body.data.encounter_id ?? null,
      kind: body.data.kind,
      accepted_text: body.data.accepted_text,
      version: body.data.version ?? "1",
      accepted_at: new Date().toISOString(),
      accepted_by_patient: body.data.accepted_by_patient,
      accepted_by_name: body.data.accepted_by_name,
      accepted_by_relation: body.data.accepted_by_relation?.trim() || null,
      acceptance_method: body.data.acceptance_method,
      acceptance_channel: body.data.acceptance_channel,
      evidence_attachment_id: body.data.evidence_attachment_id ?? null,
      signed_by: ctx.session.id,
    })
    .select()
    .single();

  if (error) return dbError(error);

  return NextResponse.json({ consent: data }, { status: 201 });
}