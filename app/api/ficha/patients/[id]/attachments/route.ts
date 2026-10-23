import { NextResponse } from "next/server";
import { z } from "zod";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
  orgPatient,
  auditPatientView,
  type FichaContext,
} from "@/lib/ficha/http";
import { attachmentSchema } from "@/lib/ficha/schemas";
import { isAttachmentKindAllowed } from "@/lib/ficha/attachments";

const attachmentRecordSchema = attachmentSchema
  .omit({ patient_id: true })
  .extend({
    storage_path: z.string().trim().min(1, "Falta la ruta del archivo").max(512),
    file_name: z.string().trim().max(255).nullable().optional(),
    mime: z.string().trim().max(120).nullable().optional(),
    size_bytes: z.number().int().min(0).nullable().optional(),
  });

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

function detectAttachmentMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

async function removeUploadedObject(
  ctx: FichaContext,
  path: string,
): Promise<boolean> {
  const { error } = await ctx.supabase.storage.from("ficha-adjuntos").remove([path]);
  if (error) {
    console.error("[ficha] no se pudo limpiar un objeto adjunto rechazado");
    return false;
  }
  return true;
}

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
  const auditError = await auditPatientView(ctx, id, "attachments");
  if (auditError) return auditError;

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

  const path = body.data.storage_path;
  if (!path.startsWith(`${ctx.session.orgId}/${id}/`)) {
    return forbidden("La ruta del archivo no corresponde a este paciente");
  }

  if (!isAttachmentKindAllowed(ctx.session.orgType, body.data.kind)) {
    const removed = await removeUploadedObject(ctx, path);
    return NextResponse.json(
      {
        error: removed
          ? "Ese tipo de adjunto no corresponde a la especialidad de esta organización."
          : "Ese tipo de adjunto no corresponde a la especialidad de esta organización y no se pudo limpiar el archivo del almacenamiento.",
      },
      { status: removed ? 400 : 500 },
    );
  }

  const { data: uploaded, error: downloadError } = await ctx.supabase.storage
    .from("ficha-adjuntos")
    .download(path);
  if (downloadError || !uploaded) {
    return dbError(downloadError ?? { message: "No se pudo leer el archivo subido" });
  }

  if (uploaded.size > MAX_ATTACHMENT_BYTES) {
    const removed = await removeUploadedObject(ctx, path);
    return NextResponse.json(
      {
        error: removed
          ? "El archivo supera el límite de 20 MiB"
          : "El archivo supera el límite de 20 MiB y no se pudo limpiar del almacenamiento",
      },
      { status: removed ? 413 : 500 },
    );
  }

  const mime = detectAttachmentMime(new Uint8Array(await uploaded.arrayBuffer()));
  if (!mime) {
    const removed = await removeUploadedObject(ctx, path);
    return NextResponse.json(
      {
        error: removed
          ? "El contenido debe ser un PDF, JPEG, PNG o WebP válido"
          : "El archivo no es válido y no se pudo limpiar del almacenamiento",
      },
      { status: removed ? 415 : 500 },
    );
  }

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
      mime,
      size_bytes: uploaded.size,
      created_by: ctx.session.id,
    })
    .select()
    .single();

  if (error) {
    const removed = await removeUploadedObject(ctx, path);
    if (!removed) {
      return NextResponse.json(
        { error: "No se pudo registrar el adjunto ni limpiar el archivo del almacenamiento" },
        { status: 500 },
      );
    }
    return dbError(error);
  }

  return NextResponse.json({ attachment: data }, { status: 201 });
}