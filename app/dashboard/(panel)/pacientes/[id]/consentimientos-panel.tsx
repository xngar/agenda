"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Attachment, Consent, ConsentKind, Encounter, OrganizationType } from "@/lib/ficha/types";
import { Card, Button, ErrorNotice, Field, Spinner, inputClasses } from "@/components/ui";
import { FichaCardHeader } from "./panels-shared";

interface ConsentRecord extends Consent {
  evidence_attachment?: Pick<Attachment, "id" | "file_name"> | null;
}

type EncounterOption = Pick<Encounter, "id" | "started_at" | "care_type">;

const CONSENTIMIENTOS_PSICOLOGICOS = [
  { value: "psicoterapia", label: "Psicoterapia" },
  { value: "atencion_online", label: "Atención psicológica a distancia" },
  { value: "datos_personales", label: "Información sobre tratamiento de datos" },
] as const;

const CONSENTIMIENTOS_MEDICOS = [
  { value: "medical_procedure", label: "Procedimiento médico" },
  { value: "medical_treatment", label: "Tratamiento médico" },
  { value: "medical_anesthesia", label: "Anestesia o sedación" },
  { value: "datos_personales", label: "Información sobre tratamiento de datos" },
  { value: "other", label: "Otro" },
] as const;

const CAMPOS_MEDICOS = [
  { key: "procedure", label: "Procedimiento o atención propuesta", maxLength: 300 },
  { key: "purpose", label: "Propósito y descripción", maxLength: 2000 },
  { key: "benefits", label: "Beneficios esperados", maxLength: 2000 },
  { key: "risks", label: "Riesgos relevantes y molestias posibles", maxLength: 3000 },
  { key: "alternatives", label: "Alternativas disponibles", maxLength: 2000 },
  { key: "refusal_consequences", label: "Consecuencias de rechazar o postergar", maxLength: 2000 },
] as const;

type CampoMedico = (typeof CAMPOS_MEDICOS)[number]["key"];

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

export function ConsentimientosPanel({
  patientId,
  orgType,
}: {
  patientId: string;
  orgType: Extract<OrganizationType, "medical" | "psychological">;
}) {
  const [consents, setConsents] = useState<ConsentRecord[] | null>(null);
  const [attachments, setAttachments] = useState<Attachment[] | null>(null);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [encounters, setEncounters] = useState<EncounterOption[] | null>(null);
  const [encountersError, setEncountersError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<ConsentKind>(
    orgType === "medical" ? "medical_procedure" : "psicoterapia",
  );
  const [encounterId, setEncounterId] = useState("");
  const [outcome, setOutcome] = useState<"accepted" | "rejected">("accepted");
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
  const [decisionConfirmed, setDecisionConfirmed] = useState(false);
  const [medicalDetails, setMedicalDetails] = useState<Record<CampoMedico, string>>({
    procedure: "",
    purpose: "",
    benefits: "",
    risks: "",
    alternatives: "",
    refusal_consequences: "",
  });
  const tiposConsentimiento =
    orgType === "medical" ? CONSENTIMIENTOS_MEDICOS : CONSENTIMIENTOS_PSICOLOGICOS;
  const isMedicalConsent = kind.startsWith("medical_");
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

  const cargarAtenciones = useCallback(async () => {
    setEncountersError(null);
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/encounters`);
      const data = (await response.json()) as { encounters?: EncounterOption[]; error?: string };
      if (!response.ok) {
        setEncountersError(data.error ?? "No se pudieron cargar las atenciones");
        return;
      }
      setEncounters(data.encounters ?? []);
    } catch {
      setEncountersError("No pudimos conectarnos al cargar las atenciones.");
    }
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, setState tras await
    void cargar();
  }, [cargar]);

  function resetForm() {
    setKind(orgType === "medical" ? "medical_procedure" : "psicoterapia");
    setOutcome("accepted");
    setEncounterId("");
    setAcceptedByPatient(true);
    setAcceptedByName("");
    setAcceptedByRelation("");
    setAcceptanceMethod("verbal");
    setAcceptanceChannel("presencial");
    setEvidenceAttachmentId("");
    setVersion("1");
    setAcceptedText("");
    setDecisionConfirmed(false);
    setMedicalDetails({
      procedure: "",
      purpose: "",
      benefits: "",
      risks: "",
      alternatives: "",
      refusal_consequences: "",
    });
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
          encounter_id: encounterId || null,
          outcome,
          ...(isMedicalConsent ? medicalDetails : { accepted_text: acceptedText }),
          version,
          accepted_by_patient: acceptedByPatient,
          accepted_by_name: acceptedByName,
          accepted_by_relation: acceptedByPatient ? null : acceptedByRelation,
          acceptance_method: acceptanceMethod,
          acceptance_channel: acceptanceChannel,
          evidence_attachment_id: evidenceAttachmentId || null,
          decisionConfirmed,
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
          description={
            orgType === "medical"
              ? "Documenta la información entregada y la decisión del paciente o representante. Este registro no constituye una firma electrónica ni reemplaza los requisitos aplicables a cada procedimiento."
              : "Registra por separado qué información se aceptó, cómo se obtuvo la aceptación y por qué canal. Este registro no constituye una firma electrónica."
          }
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const shouldOpen = !formOpen;
                setFormOpen(shouldOpen);
                if (shouldOpen) {
                  void cargarAdjuntos();
                  void cargarAtenciones();
                }
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
                  {tiposConsentimiento.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              {!isMedicalConsent ? <p className="text-sm text-neutral-600 sm:col-span-2">
                {kind === "psicoterapia"
                  ? "Registra la aceptación del proceso de atención psicológica."
                  : kind === "atencion_online"
                    ? "Registra por separado la información y aceptación asociada a la atención psicológica a distancia."
                    : "Registra por separado el aviso o consentimiento sobre tratamiento de datos personales y de salud que fue efectivamente informado y aceptado, según corresponda."}
              </p> : null}
              {isMedicalConsent ? (
                <div className="space-y-3 sm:col-span-2">
                  <p className="text-sm text-neutral-600">
                    Completa la información explicada al paciente. Usa “No aplica” cuando corresponda y adapta el contenido al caso clínico y al protocolo de la organización.
                  </p>
                  {CAMPOS_MEDICOS.map(({ key, label, maxLength }) => (
                    <Field key={key} label={label} htmlFor={`consent-${key}`}>
                      <textarea
                        id={`consent-${key}`}
                        rows={key === "procedure" ? 2 : 3}
                        maxLength={maxLength}
                        minLength={2}
                        required
                        className={inputClasses}
                        value={medicalDetails[key]}
                        onChange={(event) =>
                          setMedicalDetails((current) => ({ ...current, [key]: event.target.value }))
                        }
                      />
                    </Field>
                  ))}
                </div>
              ) : null}
              {orgType === "medical" ? (
                <Field label="Decisión registrada" htmlFor="consent-outcome">
                  <select
                    id="consent-outcome"
                    className={inputClasses}
                    value={outcome}
                    onChange={(event) => setOutcome(event.target.value as typeof outcome)}
                  >
                    <option value="accepted">Acepta la propuesta</option>
                    <option value="rejected">Rechaza la propuesta</option>
                  </select>
                </Field>
              ) : null}
              <Field label="Atención relacionada (opcional)" htmlFor="consent-encounter">
                <select
                  id="consent-encounter"
                  className={inputClasses}
                  value={encounterId}
                  onChange={(event) => setEncounterId(event.target.value)}
                  disabled={encounters === null}
                >
                  <option value="">Sin vincular a una atención</option>
                  {(encounters ?? []).map((encounter) => (
                    <option key={encounter.id} value={encounter.id}>
                      {fechaHora(encounter.started_at)}
                      {encounter.care_type ? ` · ${encounter.care_type}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {encountersError ? (
                <div className="space-y-2 sm:col-span-2">
                  <ErrorNotice message={encountersError} />
                  <Button type="button" size="sm" variant="secondary" onClick={() => void cargarAtenciones()}>
                    Reintentar carga de atenciones
                  </Button>
                </div>
              ) : null}
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
            {!isMedicalConsent ? (
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
            ) : null}
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-neutral-800">
                {orgType === "medical" ? "Persona que tomó la decisión" : "Persona que aceptó"}
              </legend>
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
                checked={decisionConfirmed}
                onChange={(event) => setDecisionConfirmed(event.target.checked)}
              />
              <span>
                {orgType === "medical"
                  ? "Confirmo que registré fielmente la información entregada y la decisión expresada; esto no captura una firma digital."
                  : "Confirmo que la persona indicada aceptó este texto y que estoy registrando lo ocurrido, no capturando una firma digital."}
              </span>
            </label>
            <Button
              type="submit"
              disabled={
                saving ||
                !decisionConfirmed ||
                (acceptanceMethod === "documento" && !evidenceAttachmentId)
              }
            >
              {saving ? "Guardando…" : "Guardar decisión"}
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
                    {[
                      ...CONSENTIMIENTOS_MEDICOS,
                      ...CONSENTIMIENTOS_PSICOLOGICOS,
                    ].find((option) => option.value === consent.kind)?.label ?? consent.kind}
                    {consent.outcome
                      ? ` · ${consent.outcome === "accepted" ? "Aceptado" : "Rechazado"}`
                      : ""}
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
                    {orgType === "medical" ? "Ver información y decisión registradas" : "Ver texto registrado"}
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
