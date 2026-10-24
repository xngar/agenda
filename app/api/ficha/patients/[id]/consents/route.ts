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

  const { data: organization, error: organizationError } = await ctx.supabase
    .from("organizations")
    .select("type")
    .eq("id", ctx.session.orgId)
    .maybeSingle();
  if (organizationError) return dbError(organizationError);
  if (!organization) return NextResponse.json({ error: "No se encontró la organización." }, { status: 404 });

  const medicalKinds = ["medical_procedure", "medical_treatment", "medical_anesthesia"];
  if (
    (medicalKinds.includes(body.data.kind) && organization.type !== "medical") ||
    (organization.type === "medical" && !medicalKinds.includes(body.data.kind) &&
      !["datos_personales", "other"].includes(body.data.kind))
  ) {
    return NextResponse.json(
      { error: "El tipo de consentimiento no corresponde a la ficha de esta organización." },
      { status: 400 },
    );
  }

  if (body.data.encounter_id) {
    const { data: encounter, error: encounterError } = await ctx.supabase
      .from("encounters")
      .select("id")
      .eq("id", body.data.encounter_id)
      .eq("org_id", ctx.session.orgId)
      .eq("patient_id", id)
      .maybeSingle();
    if (encounterError) return dbError(encounterError);
    if (!encounter) {
      return NextResponse.json(
        { error: "La atención debe pertenecer a este paciente y organización." },
        { status: 400 },
      );
    }
  }

  const acceptedText = medicalKinds.includes(body.data.kind)
    ? [
        `Procedimiento o atención: ${body.data.procedure}`,
        `Propósito: ${body.data.purpose}`,
        `Beneficios esperados: ${body.data.benefits}`,
        `Riesgos relevantes: ${body.data.risks}`,
        `Alternativas: ${body.data.alternatives}`,
        `Consecuencias de rechazar o postergar: ${body.data.refusal_consequences}`,
      ].join("\n\n")
    : body.data.accepted_text;
  const maxTextLength = medicalKinds.includes(body.data.kind) ? 12000 : 8000;
  if (!acceptedText || acceptedText.length > maxTextLength) {
    return NextResponse.json({ error: "El contenido del registro supera el máximo permitido." }, { status: 400 });
  }

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
      outcome: body.data.outcome,
      accepted_text: acceptedText,
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