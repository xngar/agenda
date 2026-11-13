"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Attachment, AttachmentKind, OrganizationType } from "@/lib/ficha/types";
import {
  ATTACHMENT_MAX_BYTES,
  attachmentKindLabel,
  attachmentKindsForOrganization,
} from "@/lib/ficha/attachments";
import { Card, Button, ErrorNotice, Field, Spinner, inputClasses } from "@/components/ui";
import { Modal } from "@/components/motion/modal";
import { FichaCardHeader } from "./panels-shared";
import { TruncatedText } from "@/components/ui/truncated-text";
import { uploadPatientAttachment } from "./attachment-upload";

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
  orgType,
  puedeEliminar = false,
}: {
  patientId: string;
  orgId: string;
  orgType: OrganizationType;
  puedeEliminar?: boolean;
}) {
  const kinds = attachmentKindsForOrganization(orgType);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      await uploadPatientAttachment({
        patientId,
        orgId,
        file,
        kind,
        description: description.trim() || null,
        takenAt: takenAt || null,
      });
      toast.success("Adjunto subido y registrado");
      setFile(null);
      setDescription("");
      setTakenAt("");
      setKind("document");
      if (fileInputRef.current) fileInputRef.current.value = "";
      cargar();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos conectarnos. Intenta de nuevo.");
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
        <FichaCardHeader title="Adjuntos" />
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
        <FichaCardHeader
          title="Subir adjunto"
          description={
            orgType === "dental"
              ? "Radiografías, fotografías clínicas y documentos odontológicos."
              : orgType === "medical"
                ? "Imágenes, informes y documentos clínicos."
                : "Informes, consentimientos y documentos clínicos."
          }
        />
        <form onSubmit={subir} className="space-y-4 px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Archivo" htmlFor="file">
              <input
                id="file"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                className={`${inputClasses} file:mr-3 file:rounded-lg file:border-0 file:bg-action-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-action-primary-foreground hover:file:bg-action-primary-hover`}
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  if (selected && selected.size > ATTACHMENT_MAX_BYTES) {
                    setFile(null);
                    setError("El archivo supera el límite de 20 MiB");
                    e.currentTarget.value = "";
                    return;
                  }
                  setError(null);
                  setFile(selected);
                }}
              />
            </Field>
            <Field
              label="Tipo"
              htmlFor="kind"
              required={false}
              hint="Los documentos que respaldan un consentimiento deben subirse con el tipo «Consentimiento»."
            >
              <select id="kind" className={inputClasses} value={kind} onChange={(e) => setKind(e.target.value as AttachmentKind)}>
                {kinds.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Descripción" htmlFor="description" required={false}>
              <input id="description" className={inputClasses} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field
              label={
                orgType === "dental"
                  ? "Fecha (radiografía o foto)"
                  : orgType === "medical"
                    ? "Fecha del examen"
                    : "Fecha del documento (si aplica)"
              }
              htmlFor="taken_at"
              required={false}
            >
              <input id="taken_at" type="date" className={inputClasses} value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" disabled={subiendo || !file}>{subiendo ? "Subiendo…" : "Subir adjunto"}</Button>
        </form>
      </Card>

      <Card>
        <FichaCardHeader title="Adjuntos registrados" />
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
                      <span className="shrink-0 rounded-full bg-brand-sky-100 px-2 py-0.5 text-xs font-semibold text-action-primary">
                        {attachmentKindLabel(a.kind) ?? a.kind}
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
                      className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full border border-brand-navy-200 px-3 text-sm font-semibold text-action-primary hover:border-action-primary/40 hover:bg-action-primary/5 hover:text-action-primary"
                      href={`/api/ficha/attachments/${a.id}/url`}
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
        titleClassName="text-lg font-bold text-action-primary"
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
