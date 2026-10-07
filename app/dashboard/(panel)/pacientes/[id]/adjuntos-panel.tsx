"use client";

import { useCallback, useEffect, useState } from "react";
import type { Attachment, AttachmentKind } from "@/lib/ficha/types";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Card, CardHeader, Button, ErrorNotice, InfoNotice, Field, Spinner, inputClasses } from "@/components/ui";

const KINDS: { value: AttachmentKind; label: string }[] = [
  { value: "document", label: "Documento" },
  { value: "radiografia", label: "Radiografía" },
  { value: "foto_intraoral", label: "Foto intraoral" },
  { value: "foto_extraoral", label: "Foto extraoral" },
  { value: "modelo", label: "Modelo" },
  { value: "consentimiento", label: "Consentimiento" },
  { value: "informe", label: "Informe" },
  { value: "other", label: "Otro" },
];

const KIND_LABEL: Record<AttachmentKind, string> = Object.fromEntries(
  KINDS.map((k) => [k.value, k.label]),
) as Record<AttachmentKind, string>;

const fmtBytes = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

export function AdjuntosPanel({ patientId, orgId }: { patientId: string; orgId: string }) {
  const [attachments, setAttachments] = useState<Attachment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<AttachmentKind>("document");
  const [description, setDescription] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/attachments`);
      const data = (await response.json()) as { attachments?: Attachment[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudieron cargar los adjuntos");
        return;
      }
      setAttachments(data.attachments ?? []);
    } catch {
      setError("No pudimos conectarnos.");
    }
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, setState tras await
    cargar();
  }, [cargar]);

  async function subir(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    if (!file) {
      setError("Selecciona un archivo");
      return;
    }
    setSubiendo(true);
    try {
      const cli = supabaseBrowser();
      if (!cli) {
        setError("Sin configuración de Storage");
        return;
      }
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${orgId}/${patientId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upError } = await cli.storage.from("ficha-adjuntos").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upError) {
        setError(upError.message);
        return;
      }

      const response = await fetch(`/api/ficha/patients/${patientId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          kind,
          description: description.trim() || null,
          taken_at: takenAt || null,
          storage_path: path,
          file_name: file.name,
          mime: file.type || null,
          size_bytes: file.size,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo registrar el adjunto");
        return;
      }
      setAviso("Adjunto subido y registrado.");
      setFile(null);
      setDescription("");
      setTakenAt("");
      setKind("document");
      cargar();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setSubiendo(false);
    }
  }

  if (attachments === null) {
    return (
      <Card>
        <CardHeader title="Adjuntos" />
        <div className="px-5 py-8">
          <Spinner label="Cargando adjuntos…" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorNotice message={error} /> : null}
      {aviso ? <InfoNotice>{aviso}</InfoNotice> : null}

      <Card>
        <CardHeader title="Subir adjunto" description="Radiografías, fotografías o documentos complementarios." />
        <form onSubmit={subir} className="space-y-4 px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Archivo" htmlFor="file">
              <input
                id="file"
                type="file"
                className={`${inputClasses} file:mr-3 file:rounded-lg file:border-0 file:bg-brand-sky-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-navy`}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            <Field label="Tipo" htmlFor="kind" required={false}>
              <select id="kind" className={inputClasses} value={kind} onChange={(e) => setKind(e.target.value as AttachmentKind)}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Descripción" htmlFor="description" required={false}>
              <input id="description" className={inputClasses} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="Fecha (radiografía o foto)" htmlFor="taken_at" required={false}>
              <input id="taken_at" type="date" className={inputClasses} value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" disabled={subiendo || !file}>{subiendo ? "Subiendo…" : "Subir adjunto"}</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Adjuntos registrados" />
        <ul className="divide-y divide-neutral-100">
          {attachments.length === 0 ? (
            <li className="px-5 py-8 text-sm text-neutral-500">Sin adjuntos registrados.</li>
          ) : (
            attachments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-neutral-900">
                    <span className="rounded-full bg-brand-sky-100 px-2 py-0.5 text-xs font-semibold text-brand-navy-900">
                      {KIND_LABEL[a.kind] ?? a.kind}
                    </span>
                    <span className="truncate">{a.description ?? a.file_name ?? "Adjunto"}</span>
                  </p>
                  <p className="text-sm text-neutral-600">
                    {a.file_name}
                    {a.size_bytes ? ` · ${fmtBytes(a.size_bytes)}` : ""}
                    {a.taken_at ? ` · ${a.taken_at.slice(0, 10)}` : ""}
                    {a.created_at ? ` · ${new Date(a.created_at).toLocaleDateString("es-CL")}` : ""}
                  </p>
                </div>
                <a
                  className="inline-flex min-h-9 items-center rounded-xl border border-brand-navy-200 px-3 text-sm font-semibold text-brand-navy hover:bg-brand-navy-50"
                  href={`/api/ficha/attachments/${a.id}/url`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Descargar
                </a>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}