"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Attachment, AttachmentKind } from "@/lib/ficha/types";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Card, CardHeader, Button, ErrorNotice, Field, Spinner, inputClasses } from "@/components/ui";
import { Modal } from "@/components/motion/modal";
import { TruncatedText } from "@/components/ui/truncated-text";

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

const MAX_NOMBRE = 44;

function acortarTexto(valor: string, max = MAX_NOMBRE): string {
  if (valor.length <= max) return valor;
  return `${valor.slice(0, max).trimEnd()}…`;
}

function acortarArchivo(nombre: string, max = MAX_NOMBRE): string {
  if (nombre.length <= max) return nombre;

  const punto = nombre.lastIndexOf(".");
  const extension = punto > 0 && nombre.length - punto <= 10 ? nombre.slice(punto) : "";
  const base = extension ? nombre.slice(0, punto) : nombre;
  const disponible = Math.max(1, max - extension.length - 1);

  return `${base.slice(0, disponible).trimEnd()}…${extension}`;
}

export function AdjuntosPanel({
  patientId,
  orgId,
  puedeEliminar = false,
}: {
  patientId: string;
  orgId: string;
  puedeEliminar?: boolean;
}) {
  const [attachments, setAttachments] = useState<Attachment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<AttachmentKind>("document");
  const [description, setDescription] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [aEliminar, setAEliminar] = useState<Attachment | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

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
      toast.success("Adjunto subido y registrado");
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

  async function eliminar() {
    if (!aEliminar) return;

    setErrorEliminar(null);
    setEliminando(true);
    try {
      const response = await fetch(`/api/ficha/attachments/${aEliminar.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setErrorEliminar(data.error ?? "No se pudo eliminar el adjunto");
        return;
      }
      setAttachments((prev) => prev?.filter((a) => a.id !== aEliminar.id) ?? prev);
      setAEliminar(null);
      toast.success("Adjunto eliminado");
    } catch {
      setErrorEliminar("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setEliminando(false);
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
            attachments.map((a) => {
              const titulo = a.description ?? a.file_name ?? "Adjunto";
              const tituloCorto = a.description ? acortarTexto(titulo) : acortarArchivo(titulo);
              const meta = [
                a.size_bytes ? fmtBytes(a.size_bytes) : null,
                a.taken_at ? `Examen ${a.taken_at.slice(0, 10)}` : null,
                a.created_at ? `Subido ${new Date(a.created_at).toLocaleDateString("es-CL")}` : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 font-medium text-neutral-900">
                      <span className="shrink-0 rounded-full bg-brand-sky-100 px-2 py-0.5 text-xs font-semibold text-brand-navy-900">
                        {KIND_LABEL[a.kind] ?? a.kind}
                      </span>
                      <TruncatedText
                        text={tituloCorto}
                        fullText={titulo}
                        className="min-w-0 flex-1"
                      />
                    </div>
                    {a.description && a.file_name ? (
                      <TruncatedText
                        text={acortarArchivo(a.file_name)}
                        fullText={a.file_name}
                        className="text-sm text-neutral-600"
                      />
                    ) : null}
                    {meta ? <p className="text-xs text-neutral-500">{meta}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      className="inline-flex min-h-9 items-center whitespace-nowrap rounded-xl border border-brand-navy-200 px-3 text-sm font-semibold text-brand-navy hover:bg-brand-navy-50"
                      href={`/api/ficha/attachments/${a.id}/url`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Descargar
                    </a>
                    {puedeEliminar ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setErrorEliminar(null);
                          setAEliminar(a);
                        }}
                      >
                        Eliminar
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </Card>

      <Modal
        open={Boolean(aEliminar)}
        onClose={() => {
          if (eliminando) return;
          setAEliminar(null);
          setErrorEliminar(null);
        }}
        title="¿Eliminar este adjunto?"
        titleClassName="text-lg font-bold text-brand-navy"
        size="md"
        panelClassName="border-transparent shadow-card"
        busy={eliminando}
      >
        <p className="mt-2 text-sm text-neutral-600">
          Se eliminará{" "}
          <span className="break-all font-medium text-neutral-900">
            {aEliminar ? (aEliminar.description ?? aEliminar.file_name ?? "el archivo") : "el archivo"}
          </span>{" "}
          de la ficha. Esta acción no se puede deshacer.
        </p>

        {errorEliminar ? (
          <div className="mt-4">
            <ErrorNotice message={errorEliminar} />
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={eliminando}
            onClick={() => {
              setAEliminar(null);
              setErrorEliminar(null);
            }}
          >
            Cancelar
          </Button>
          <Button variant="danger" size="sm" disabled={eliminando} onClick={eliminar}>
            {eliminando ? "Eliminando…" : "Eliminar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
