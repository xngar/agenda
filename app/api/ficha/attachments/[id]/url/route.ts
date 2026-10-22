import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  dbError,
  auditPatientView,
} from "@/lib/ficha/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { data, error } = await ctx.supabase
    .from("attachments")
    .select("storage_path,file_name,org_id,patient_id")
    .eq("id", id)
    .eq("org_id", ctx.session.orgId)
    .maybeSingle();

  if (error) return dbError(error);
  if (!data) return notFound("Adjunto no encontrado");

  const { data: signed, error: signedError } = await ctx.supabase.storage
    .from("ficha-adjuntos")
    .createSignedUrl(data.storage_path, 300, { download: data.file_name });

  if (signedError || !signed) return dbError(signedError ?? { message: "No se pudo firmar la URL" });
  const auditError = await auditPatientView(ctx, data.patient_id, "attachments");
  if (auditError) return auditError;

  return NextResponse.redirect(signed.signedUrl);
}