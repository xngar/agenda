import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  dbError,
} from "@/lib/ficha/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { data, error } = await ctx.supabase
    .from("attachments")
    .select("storage_path,file_name,org_id")
    .eq("id", id)
    .eq("org_id", ctx.session.orgId)
    .maybeSingle();

  if (error) return dbError(error);
  if (!data) return notFound("Adjunto no encontrado");

  const { data: signed, error: signedError } = await ctx.supabase.storage
    .from("ficha-adjuntos")
    .createSignedUrl(data.storage_path, 300);

  if (signedError || !signed) return dbError(signedError ?? { message: "No se pudo firmar la URL" });

  return NextResponse.json({ url: signed.signedUrl, file_name: data.file_name });
}