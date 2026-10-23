"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Attachment, Consent } from "@/lib/ficha/types";
import { Card, Button, ErrorNotice, Field, Spinner, inputClasses } from "@/components/ui";
import { FichaCardHeader } from "./panels-shared";

interface ConsentRecord extends Consent {
  evidence_attachment?: Pick<Attachment, "id" | "file_name"> | null;
}

const TIPO_CONSENTIMIENTO = [
  { value: "psicoterapia", label: "Psicoterapia" },
  { value: "atencion_online", label: "Atención psicológica a distancia" },
  { value: "datos_personales", label: "Información sobre tratamiento de datos" },
] as const;

const METODOS_ACEPTACION = [
  { value: "verbal", label: "Verbal" },
  { value: "documento", label: "Documento firmado" },
] as const;

const CANALES_ACEPTACION = [
  { value: "presencial", label: "Presencial" },
  { value: "videollamada", label: "Videollamada" },
  { value: "llamada_telefonica", label: "Llamada telefónica" },
  { value: "correo_electronico", label: "Correo electrónico" },
  { value: "plataforma_digital", label: "Plataforma digital" },
] as const;

function fechaHora(value: string): string {
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  });
}

export function ConsentimientosPanel({ patientId }: { patientId: string }) {
  const [consents, setConsents] = useState<ConsentRecord[] | null>(null);
  const [attachments, setAttachments] = useState<Attachment[] | null>(null);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<(typeof TIPO_CONSENTIMIENTO)[number]["value"]>("psicoterapia");
  const [acceptedByPatient, setAcceptedByPatient] = useState(true);
  const [acceptedByName, setAcceptedByName] = useState("");
  const [acceptedByRelation, setAcceptedByRelation] = useState("");
  const [acceptanceMethod, setAcceptanceMethod] =
    useState<(typeof METODOS_ACEPTACION)[number]["value"]>("verbal");
  const [acceptanceChannel, setAcceptanceChannel] =
    useState<(typeof CANALES_ACEPTACION)[number]["value"]>("presencial");
  const [evidenceAttachmentId, setEvidenceAttachmentId] = useState("");
  const [version, setVersion] = useState("1");
  const [acceptedText, setAcceptedText] = useState("");
  const [consentObtained, setConsentObtained] = useState(false);
  const consentAttachments = attachments?.filter((attachment) => attachment.kind === "consentimiento") ?? null;

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/consents`);
      const data = (await response.json()) as { consents?: ConsentRecord[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudieron cargar los consentimientos");
        return;
      }
      setConsents(data.consents ?? []);
    } catch {
      setError("No pudimos conectarnos.");
    }
  }, [patientId]);

  const cargarAdjuntos = useCallback(async () => {
    setAttachmentsError(null);
    setAttachments(null);
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/attachments`);
      const data = (await response.json()) as { attachments?: Attachment[]; error?: string };
      if (!response.ok) {
        setAttachmentsError(data.error ?? "No se pudieron cargar los documentos de respaldo");
        return;
      }
      setAttachments(data.attachments ?? []);
    } catch {
      setAttachmentsError("No pudimos conectarnos al cargar los documentos de respaldo.");
    }
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, setState tras await
    void cargar();
  }, [cargar]);

  function resetForm() {
    setKind("psicoterapia");
    setAcceptedByPatient(true);
    setAcceptedByName("");
    setAcceptedByRelation("");
    setAcceptanceMethod("verbal");
    setAcceptanceChannel("presencial");
    setEvidenceAttachmentId("");
    setVersion("1");
    setAcceptedText("");
    setConsentObtained(false);
  }

  async function guardar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/consents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          accepted_text: acceptedText,
          version,
          accepted_by_patient: acceptedByPatient,
          accepted_by_name: acceptedByName,
          accepted_by_relation: acceptedByPatient ? null : acceptedByRelation,
          acceptance_method: acceptanceMethod,
          acceptance_channel: acceptanceChannel,
          evidence_attachment_id: evidenceAttachmentId || null,
          consentObtained,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo registrar el consentimiento");
        return;
      }
      toast.success("Consentimiento registrado");
      setFormOpen(false);
      resetForm();
      await cargar();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (consents === null) {
    return (
      <Card>
        <FichaCardHeader title="Consentimientos" />
        <div className="px-5 py-8">
          {error ? (
            <div className="space-y-3">
              <ErrorNotice message={error} />
              <Button variant="secondary" onClick={() => void cargar()}>Reintentar</Button>
            </div>
          ) : (
            <Spinner label="Cargando consentimientos…" />
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorNotice message={error} /> : null}
      <Card>
        <FichaCardHeader
          title="Consentimientos"
          description="Registra por separado qué información se aceptó, cómo se obtuvo la aceptación y por qué canal. Este registro no constituye una firma electrónica."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const shouldOpen = !formOpen;
                setFormOpen(shouldOpen);
                if (shouldOpen) void cargarAdjuntos();
              }}
            >
              {formOpen ? "Cancelar" : "Registrar consentimiento"}
            </Button>
          }
        />
        {formOpen ? (
          <form onSubmit={guardar} className="space-y-4 border-t border-neutral-200 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo de consentimiento" htmlFor="consent-kind">
                <select
                  id="consent-kind"
                  className={inputClasses}
                  value={kind}
                  onChange={(event) => setKind(event.target.value as typeof kind)}
                >
                  {TIPO_CONSENTIMIENTO.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <p className="text-sm text-neutral-600 sm:col-span-2">
                {kind === "psicoterapia"
                  ? "Registra la aceptación del proceso de atención psicológica."
                  : kind === "atencion_online"
                    ? "Registra por separado la información y aceptación asociada a la atención psicológica a distancia."
                    : "Registra por separado el aviso o consentimiento sobre tratamiento de datos personales y de salud que fue efectivamente informado y aceptado, según corresponda."}
              </p>
              <Field label="Versión del documento" htmlFor="consent-version">
                <input
                  id="consent-version"
                  className={inputClasses}
                  maxLength={20}
                  required
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                />
              </Field>
            </div>
            <Field
              label="Texto aceptado"
              htmlFor="consent-text"
              hint="Copia el texto exacto de la versión aceptada por el paciente o su representante."
            >
              <textarea
                id="consent-text"
                rows={6}
                minLength={20}
                maxLength={8000}
                required
                className={inputClasses}
                value={acceptedText}
                onChange={(event) => setAcceptedText(event.target.value)}
              />
            </Field>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-neutral-800">Persona que aceptó</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name="accepted-by"
                    checked={acceptedByPatient}
                    onChange={() => setAcceptedByPatient(true)}
                  />
                  Paciente
                </label>
                <label className="inline-flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name="accepted-by"
                    checked={!acceptedByPatient}
                    onChange={() => setAcceptedByPatient(false)}
                  />
                  Representante
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre completo" htmlFor="consent-accepted-name">
                  <input
                    id="consent-accepted-name"
                    className={inputClasses}
                    maxLength={120}
                    minLength={2}
                    required
                    value={acceptedByName}
                    onChange={(event) => setAcceptedByName(event.target.value)}
                  />
                </Field>
                {!acceptedByPatient ? (
                  <Field label="Vínculo con el paciente" htmlFor="consent-accepted-relation">
                    <input
                      id="consent-accepted-relation"
                      className={inputClasses}
                      maxLength={100}
                      required
                      value={acceptedByRelation}
                      onChange={(event) => setAcceptedByRelation(event.target.value)}
                      placeholder="P. ej. madre, padre o tutor"
                    />
                  </Field>
                ) : null}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Forma de aceptación" htmlFor="consent-method">
                <select
                  id="consent-method"
                  className={inputClasses}
                  value={acceptanceMethod}
                  onChange={(event) => setAcceptanceMethod(event.target.value as typeof acceptanceMethod)}
                >
                  {METODOS_ACEPTACION.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Canal de aceptación" htmlFor="consent-channel">
                <select
                  id="consent-channel"
                  className={inputClasses}
                  value={acceptanceChannel}
                  onChange={(event) => setAcceptanceChannel(event.target.value as typeof acceptanceChannel)}
                >
                  {CANALES_ACEPTACION.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label={acceptanceMethod === "documento" ? "Documento firmado (obligatorio)" : "Documento de respaldo (opcional)"}
              htmlFor="consent-evidence"
              hint="Selecciona un archivo de tipo Consentimiento ya cargado en la pestaña Adjuntos. Para aceptación verbal a distancia, puedes adjuntar respaldo si está disponible."
            >
              <select
                id="consent-evidence"
                className={inputClasses}
                value={evidenceAttachmentId}
                required={acceptanceMethod === "documento"}
                onChange={(event) => setEvidenceAttachmentId(event.target.value)}
                disabled={attachments === null}
              >
                <option value="">Sin documento adjunto</option>
                {(consentAttachments ?? [])
                  .map((attachment) => (
                    <option key={attachment.id} value={attachment.id}>
                      {attachment.file_name ?? attachment.description ?? "Documento sin nombre"}
                    </option>
                  ))}
              </select>
            </Field>
            {attachmentsError ? (
              <div className="space-y-2">
                <ErrorNotice message={attachmentsError} />
                <Button type="button" size="sm" variant="secondary" onClick={() => void cargarAdjuntos()}>
                  Reintentar carga de adjuntos
                </Button>
              </div>
            ) : consentAttachments === null ? (
              <p className="text-sm text-neutral-500">Cargando documentos de respaldo…</p>
            ) : consentAttachments.length === 0 ? (
              <p className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
                Aún no hay documentos de consentimiento adjuntos. Para registrar uno firmado, cárgalo primero en Adjuntos con el tipo “Consentimiento”.
              </p>
            ) : null}
            <label className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 text-sm text-neutral-700">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0"
                checked={consentObtained}
                onChange={(event) => setConsentObtained(event.target.checked)}
              />
              <span>Confirmo que la persona indicada aceptó este texto y que estoy registrando lo ocurrido, no capturando una firma digital.</span>
            </label>
            <Button
              type="submit"
              disabled={
                saving ||
                !consentObtained ||
                (acceptanceMethod === "documento" && !evidenceAttachmentId)
              }
            >
              {saving ? "Guardando…" : "Guardar registro"}
            </Button>
          </form>
        ) : null}
        <ul className="divide-y divide-neutral-100">
          {consents.length === 0 ? (
            <li className="px-5 py-8 text-sm text-neutral-500">Sin consentimientos registrados.</li>
          ) : (
            consents.map((consent) => (
              <li key={consent.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium text-neutral-900">
                    {TIPO_CONSENTIMIENTO.find((option) => option.value === consent.kind)?.label ?? consent.kind}
                    {" · "}Versión {consent.version}
                  </p>
                  <time className="text-sm text-neutral-500" dateTime={consent.accepted_at}>
                    {fechaHora(consent.accepted_at)}
                  </time>
                </div>
                {consent.acceptance_method === "por_verificar" ? (
                  <p className="text-sm text-warning-700">
                    Registro anterior: no se guardaron la identidad de quien aceptó ni el método de aceptación.
                  </p>
                ) : (
                  <p className="text-sm text-neutral-600">
                    Aceptó {consent.accepted_by_patient ? "el paciente" : "su representante"}
                    {consent.accepted_by_name ? `, ${consent.accepted_by_name}` : ""}
                    {!consent.accepted_by_patient && consent.accepted_by_relation
                      ? ` (${consent.accepted_by_relation})`
                      : ""}
                    {" · "}
                    {METODOS_ACEPTACION.find((option) => option.value === consent.acceptance_method)?.label ??
                      (consent.acceptance_method === "remoto" ? "A distancia (registro anterior)" : consent.acceptance_method)}
                    {consent.acceptance_channel
                      ? ` · ${CANALES_ACEPTACION.find((option) => option.value === consent.acceptance_channel)?.label ?? consent.acceptance_channel}`
                      : ""}
                  </p>
                )}
                {consent.acceptance_method === "documento" && !consent.evidence_attachment_id ? (
                  <p className="text-sm text-warning-700">
                    Registro anterior: no quedó vinculado el documento firmado.
                  </p>
                ) : null}
                {consent.acceptance_method !== "por_verificar" && !consent.acceptance_channel ? (
                  <p className="text-sm text-warning-700">
                    Registro anterior: no quedó especificado el canal de aceptación.
                  </p>
                ) : null}
                {consent.evidence_attachment_id ? (
                  <a
                    className="inline-flex min-h-11 items-center text-sm font-medium text-action-primary underline"
                    href={`/api/ficha/attachments/${consent.evidence_attachment_id}/url`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver respaldo: {consent.evidence_attachment?.file_name ?? "documento adjunto"}
                  </a>
                ) : null}
                <details className="text-sm">
                  <summary className="min-h-11 cursor-pointer py-2 font-medium text-action-primary">
                    Ver texto registrado
                  </summary>
                  <p className="whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-neutral-700">
                    {consent.accepted_text}
                  </p>
                </details>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}
