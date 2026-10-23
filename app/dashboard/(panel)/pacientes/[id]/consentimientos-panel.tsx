"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Consent } from "@/lib/ficha/types";
import { Card, Button, ErrorNotice, Field, Spinner, inputClasses } from "@/components/ui";
import { FichaCardHeader } from "./panels-shared";

interface ConsentRecord extends Consent {
  recorder?: { full_name: string } | null;
}

const TIPO_CONSENTIMIENTO = [
  { value: "psicoterapia", label: "Psicoterapia" },
  { value: "atencion_online", label: "Atención online" },
] as const;

const METODOS_ACEPTACION = [
  { value: "verbal", label: "Verbal" },
  { value: "documento", label: "Documento firmado" },
  { value: "remoto", label: "Remota (confirmada por el profesional)" },
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
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<(typeof TIPO_CONSENTIMIENTO)[number]["value"]>("psicoterapia");
  const [acceptedByPatient, setAcceptedByPatient] = useState(true);
  const [acceptedByName, setAcceptedByName] = useState("");
  const [acceptedByRelation, setAcceptedByRelation] = useState("");
  const [acceptanceMethod, setAcceptanceMethod] =
    useState<(typeof METODOS_ACEPTACION)[number]["value"]>("verbal");
  const [version, setVersion] = useState("1");
  const [acceptedText, setAcceptedText] = useState("");
  const [consentObtained, setConsentObtained] = useState(false);

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
          description="Registra el texto y la forma en que se obtuvo la aceptación. Este registro no constituye una firma electrónica."
          action={
            <Button size="sm" variant="secondary" onClick={() => setFormOpen((open) => !open)}>
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
            <Field label="Forma en que se obtuvo" htmlFor="consent-method">
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
            <label className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 text-sm text-neutral-700">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0"
                checked={consentObtained}
                onChange={(event) => setConsentObtained(event.target.checked)}
              />
              <span>Confirmo que la persona indicada aceptó este texto y que estoy registrando esa aceptación, no capturando una firma digital.</span>
            </label>
            <Button type="submit" disabled={saving || !consentObtained}>
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
                    {METODOS_ACEPTACION.find((option) => option.value === consent.acceptance_method)?.label}
                  </p>
                )}
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
