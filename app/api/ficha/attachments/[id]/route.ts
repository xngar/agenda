import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  dbError,
  patientAccess,
} from "@/lib/ficha/http";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;

  const { data: adjunto, error: adjuntoError } = await ctx.supabase
    .from("attachments")
    .select("id,patient_id,storage_path")
    .eq("id", id)
    .eq("org_id", ctx.session.orgId)
    .maybeSingle();

  if (adjuntoError) return dbError(adjuntoError);
  if (!adjunto) return notFound("Adjunto no encontrado");

  const { data: paciente, error: pacienteError } = await ctx.supabase
    .from("patients")
    .select("doctor_id")
    .eq("org_id", ctx.session.orgId)
    .eq("id", adjunto.patient_id)
    .maybeSingle();

  if (pacienteError) return dbError(pacienteError);
  if (!paciente) return notFound("Paciente no encontrado");

  const access = await patientAccess(ctx, {
    id: adjunto.patient_id,
    org_id: ctx.session.orgId,
    doctor_id: paciente.doctor_id,
  });
  if (!access.canViewClinical) {
    return forbidden("No tienes relación con la atención de este paciente");
  }
  if (!access.canDelete) {
    return forbidden("Solo el profesional tratante principal o el administrador puede eliminar adjuntos");
  }

  const { data: consentimientoVinculado, error: consentimientoError } = await ctx.supabase
    .from("consents")
    .select("id")
    .eq("evidence_attachment_id", id)
    .limit(1)
    .maybeSingle();

  if (consentimientoError) return dbError(consentimientoError);
  if (consentimientoVinculado) {
    return NextResponse.json(
      { error: "No se puede eliminar este adjunto porque respalda un consentimiento registrado." },
      { status: 409 },
    );
  }

  const { error: storageError } = await ctx.supabase.storage
    .from("ficha-adjuntos")
    .remove([adjunto.storage_path]);

  if (storageError) {
    return NextResponse.json({ error: "No se pudo eliminar el archivo" }, { status: 500 });
  }

  const { data: borrado, error: deleteError } = await ctx.supabase
    .from("attachments")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.session.orgId)
    .select("id")
    .maybeSingle();

  if (deleteError) return dbError(deleteError);
  if (!borrado) return forbidden("No tienes permiso para eliminar este adjunto");

  return NextResponse.json({ ok: true });
}
