import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  dbError,
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

  if (!ctx.session.isAdmin && paciente.doctor_id !== ctx.session.id) {
    return forbidden("Solo el administrador o el médico dueño del paciente puede eliminar adjuntos");
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
