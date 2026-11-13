"use client";

import type { Attachment, AttachmentKind } from "@/lib/ficha/types";
import { attachmentFileError, resolveAttachmentMime } from "@/lib/ficha/attachments";
import { supabaseBrowser } from "@/lib/supabase/browser";

export async function uploadPatientAttachment({
  patientId,
  orgId,
  file,
  kind,
  description,
  takenAt,
}: {
  patientId: string;
  orgId: string;
  file: File;
  kind: AttachmentKind;
  description?: string | null;
  takenAt?: string | null;
}): Promise<Attachment> {
  const fileError = attachmentFileError(file);
  if (fileError) throw new Error(fileError);

  const mime = resolveAttachmentMime(file.name, file.type);
  if (!mime) throw new Error("Solo se permiten archivos PDF, JPEG, PNG o WebP");

  const client = supabaseBrowser();
  if (!client) throw new Error("Sin configuración de Storage");

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${orgId}/${patientId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await client.storage
    .from("ficha-adjuntos")
    .upload(path, file, { contentType: mime, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  try {
    const response = await fetch(`/api/ficha/patients/${patientId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patientId,
        kind,
        description: description?.trim() || null,
        taken_at: takenAt || null,
        storage_path: path,
        file_name: file.name,
        mime,
        size_bytes: file.size,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      attachment?: Attachment;
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? "No se pudo registrar el adjunto");
    }
    if (!data.attachment) {
      throw new Error("No se pudo registrar el adjunto");
    }
    return data.attachment;
  } catch (error) {
    await client.storage.from("ficha-adjuntos").remove([path]).catch(() => undefined);
    throw error;
  }
}
