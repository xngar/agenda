"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationType, Patient } from "@/lib/ficha/types";
import { Card, CardHeader, Button, ErrorNotice, InfoNotice, Field, inputClasses } from "@/components/ui";

const SEXOS = [
  { value: "female", label: "Mujer" },
  { value: "male", label: "Hombre" },
  { value: "other", label: "Otro" },
  { value: "undisclosed", label: "No informado" },
];

const CIVIL = [
  { value: "single", label: "Soltero/a" },
  { value: "married", label: "Casado/a" },
  { value: "widowed", label: "Viudo/a" },
  { value: "divorced", label: "Divorciado/a" },
  { value: "other", label: "Otro" },
];

const PREVISION = [
  { value: "fonasa", label: "Fonasa" },
  { value: "isapre", label: "Isapre" },
  { value: "particular", label: "Particular" },
  { value: "other", label: "Otro" },
];

function Campo({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-neutral-900">{valor || "—"}</dd>
    </div>
  );
}

interface FormState {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  birth_date: string;
  sex: string;
  nationality: string;
  marital_status: string;
  occupation: string;
  address: string;
  comuna: string;
  prevision_type: string;
  fonasa_tramo: string;
  isapre_name: string;
  isapre_plan: string;
  emergency_name: string;
  emergency_relation: string;
  emergency_phone: string;
  tutor_name: string;
  tutor_rut: string;
  tutor_relation: string;
  tutor_phone: string;
  referral_source: string;
  patient_status: string;
}

function formFrom(p: Patient): FormState {
  return {
    nombres: p.nombres ?? "",
    apellido_paterno: p.apellido_paterno ?? "",
    apellido_materno: p.apellido_materno ?? "",
    birth_date: p.birth_date ?? "",
    sex: p.sex ?? "",
    nationality: p.nationality ?? "",
    marital_status: p.marital_status ?? "",
    occupation: p.occupation ?? "",
    address: p.address ?? "",
    comuna: p.comuna ?? "",
    prevision_type: p.prevision_type ?? "",
    fonasa_tramo: p.fonasa_tramo ?? "",
    isapre_name: p.isapre_name ?? "",
    isapre_plan: p.isapre_plan ?? "",
    emergency_name: p.emergency_name ?? "",
    emergency_relation: p.emergency_relation ?? "",
    emergency_phone: p.emergency_phone ?? "",
    tutor_name: p.tutor_name ?? "",
    tutor_rut: p.tutor_rut ?? "",
    tutor_relation: p.tutor_relation ?? "",
    tutor_phone: p.tutor_phone ?? "",
    referral_source: p.referral_source ?? "",
    patient_status: p.patient_status,
  };
}

function empty(v: string): string | null {
  return v.trim() === "" ? null : v.trim();
}

export function ResumenPanel({ patient, orgType }: { patient: Patient; orgType: OrganizationType }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<FormState>(() => formFrom(patient));
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setGuardando(true);
    try {
      const response = await fetch(`/api/ficha/patients/${patient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombres: empty(form.nombres) ?? undefined,
          apellido_paterno: empty(form.apellido_paterno) ?? undefined,
          apellido_materno: empty(form.apellido_materno) ?? undefined,
          birth_date: empty(form.birth_date) ?? undefined,
          sex: empty(form.sex) ?? undefined,
          nationality: empty(form.nationality) ?? undefined,
          marital_status: empty(form.marital_status) ?? undefined,
          occupation: empty(form.occupation) ?? undefined,
          address: empty(form.address) ?? undefined,
          comuna: empty(form.comuna) ?? undefined,
          prevision_type: empty(form.prevision_type) ?? undefined,
          fonasa_tramo: empty(form.fonasa_tramo) ?? undefined,
          isapre_name: empty(form.isapre_name) ?? undefined,
          isapre_plan: empty(form.isapre_plan) ?? undefined,
          emergency_name: empty(form.emergency_name) ?? undefined,
          emergency_relation: empty(form.emergency_relation) ?? undefined,
          emergency_phone: empty(form.emergency_phone) ?? undefined,
          tutor_name: empty(form.tutor_name) ?? undefined,
          tutor_rut: empty(form.tutor_rut) ?? undefined,
          tutor_relation: empty(form.tutor_relation) ?? undefined,
          tutor_phone: empty(form.tutor_phone) ?? undefined,
          referral_source: empty(form.referral_source) ?? undefined,
          patient_status: form.patient_status,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la ficha");
        return;
      }
      setAviso("Ficha actualizada");
      setEditando(false);
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (editando) {
    return (
      <Card>
        <CardHeader title="Editar ficha" description="Datos de identificación, contacto y previsión" />
        <form onSubmit={guardar} className="space-y-6 px-5 py-5">
          {error ? <ErrorNotice message={error} /> : null}
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-brand-navy">Datos personales</legend>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nombres" htmlFor="nombres" required={false}>
                <input id="nombres" className={inputClasses} value={form.nombres} onChange={(e) => set("nombres", e.target.value)} />
              </Field>
              <Field label="Apellido paterno" htmlFor="ap-paterno" required={false}>
                <input id="ap-paterno" className={inputClasses} value={form.apellido_paterno} onChange={(e) => set("apellido_paterno", e.target.value)} />
              </Field>
              <Field label="Apellido materno" htmlFor="ap-materno" required={false}>
                <input id="ap-materno" className={inputClasses} value={form.apellido_materno} onChange={(e) => set("apellido_materno", e.target.value)} />
              </Field>
              <Field label="Fecha de nacimiento" htmlFor="birth_date" required={false}>
                <input id="birth_date" type="date" className={inputClasses} value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
              </Field>
              <Field label="Sexo" htmlFor="sex" required={false}>
                <select id="sex" className={inputClasses} value={form.sex} onChange={(e) => set("sex", e.target.value)}>
                  <option value="">—</option>
                  {SEXOS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Nacionalidad" htmlFor="nationality" required={false}>
                <input id="nationality" className={inputClasses} value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
              </Field>
              <Field label="Estado civil" htmlFor="marital_status" required={false}>
                <select id="marital_status" className={inputClasses} value={form.marital_status} onChange={(e) => set("marital_status", e.target.value)}>
                  <option value="">—</option>
                  {CIVIL.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ocupación" htmlFor="occupation" required={false}>
                <input id="occupation" className={inputClasses} value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-brand-navy">Dirección y previsión</legend>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Dirección" htmlFor="address" required={false}>
                <input id="address" className={inputClasses} value={form.address} onChange={(e) => set("address", e.target.value)} />
              </Field>
              <Field label="Comuna" htmlFor="comuna" required={false}>
                <input id="comuna" className={inputClasses} value={form.comuna} onChange={(e) => set("comuna", e.target.value)} />
              </Field>
              <Field label="Previsión" htmlFor="prevision" required={false}>
                <select id="prevision" className={inputClasses} value={form.prevision_type} onChange={(e) => set("prevision_type", e.target.value)}>
                  <option value="">—</option>
                  {PREVISION.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              {form.prevision_type === "isapre" ? (
                <>
                  <Field label="Nombre de la isapre" htmlFor="isapre_name" required={false}>
                    <input id="isapre_name" className={inputClasses} value={form.isapre_name} onChange={(e) => set("isapre_name", e.target.value)} />
                  </Field>
                  <Field label="Plan" htmlFor="isapre_plan" required={false}>
                    <input id="isapre_plan" className={inputClasses} value={form.isapre_plan} onChange={(e) => set("isapre_plan", e.target.value)} />
                  </Field>
                </>
              ) : null}
              {form.prevision_type === "fonasa" ? (
                <Field label="Tramo Fonasa" htmlFor="tramo" required={false}>
                  <select id="tramo" className={inputClasses} value={form.fonasa_tramo} onChange={(e) => set("fonasa_tramo", e.target.value)}>
                    <option value="">—</option>
                    {["A", "B", "C", "D"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-brand-navy">Contacto de emergencia</legend>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Nombre" htmlFor="emergency_name" required={false}>
                <input id="emergency_name" className={inputClasses} value={form.emergency_name} onChange={(e) => set("emergency_name", e.target.value)} />
              </Field>
              <Field label="Parentesco" htmlFor="emergency_relation" required={false}>
                <input id="emergency_relation" className={inputClasses} value={form.emergency_relation} onChange={(e) => set("emergency_relation", e.target.value)} />
              </Field>
              <Field label="Teléfono" htmlFor="emergency_phone" required={false}>
                <input id="emergency_phone" className={inputClasses} value={form.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} />
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-brand-navy">Apoderado o tutor</legend>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nombre" htmlFor="tutor_name" required={false}>
                <input id="tutor_name" className={inputClasses} value={form.tutor_name} onChange={(e) => set("tutor_name", e.target.value)} />
              </Field>
              <Field label="RUT" htmlFor="tutor_rut" required={false}>
                <input id="tutor_rut" className={inputClasses} value={form.tutor_rut} onChange={(e) => set("tutor_rut", e.target.value)} />
              </Field>
              <Field label="Parentesco" htmlFor="tutor_relation" required={false}>
                <input id="tutor_relation" className={inputClasses} value={form.tutor_relation} onChange={(e) => set("tutor_relation", e.target.value)} />
              </Field>
              <Field label="Teléfono" htmlFor="tutor_phone" required={false}>
                <input id="tutor_phone" className={inputClasses} value={form.tutor_phone} onChange={(e) => set("tutor_phone", e.target.value)} />
              </Field>
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</Button>
            <Button variant="ghost" onClick={() => setEditando(false)} disabled={guardando}>Cancelar</Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Identificación" action={<Button size="sm" variant="secondary" onClick={() => setEditando(true)}>Editar</Button>} />
        <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre completo" valor={patient.full_name} />
          <Campo etiqueta="RUT" valor={patient.rut} />
          <Campo etiqueta="Teléfono" valor={patient.phone} />
          <Campo etiqueta="Correo" valor={patient.email} />
          <Campo etiqueta="Fecha de nacimiento" valor={patient.birth_date?.slice(0, 10)} />
          <Campo etiqueta="Sexo" valor={SEXOS.find((s) => s.value === patient.sex)?.label} />
          <Campo etiqueta="Nacionalidad" valor={patient.nationality} />
          <Campo etiqueta="Estado civil" valor={CIVIL.find((c) => c.value === patient.marital_status)?.label} />
          <Campo etiqueta="Ocupación" valor={patient.occupation} />
        </dl>
      </Card>

      <Card>
        <CardHeader title="Previsión y contacto" />
        <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Campo etiqueta="Previsión" valor={PREVISION.find((p) => p.value === patient.prevision_type)?.label} />
          <Campo etiqueta="Tramo Fonasa" valor={patient.fonasa_tramo} />
          <Campo etiqueta="Isapre" valor={patient.isapre_name ? `${patient.isapre_name}${patient.isapre_plan ? ` · ${patient.isapre_plan}` : ""}` : null} />
          <Campo etiqueta="Dirección" valor={[patient.address, patient.comuna].filter(Boolean).join(", ")} />
        </dl>
      </Card>

      <Card>
        <CardHeader title="Emergencia y apoderado" />
        <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Campo etiqueta="Contacto emergencia" valor={patient.emergency_name ? `${patient.emergency_name} (${patient.emergency_relation ?? ""})` : null} />
          <Campo etiqueta="Teléfono emergencia" valor={patient.emergency_phone} />
          <Campo etiqueta="Apoderado/a" valor={patient.tutor_name ? `${patient.tutor_name} (${patient.tutor_relation ?? ""})` : null} />
          <Campo etiqueta="RUT apoderado" valor={patient.tutor_rut} />
          <Campo etiqueta="Teléfono apoderado" valor={patient.tutor_phone} />
        </dl>
      </Card>

      <Card>
        <CardHeader title="Registro" />
        <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Campo etiqueta="Paciente desde" valor={patient.admitted_at?.slice(0, 10)} />
          <Campo etiqueta="Cómo llegó" valor={patient.referral_source} />
          <Campo etiqueta="Consentimiento" valor={patient.consent_at?.slice(0, 10)} />
          <Campo etiqueta="Tipo de organización" valor={orgType === "dental" ? "Odontológica" : orgType === "medical" ? "Médica" : "Psicológica"} />
        </dl>
      </Card>

      {aviso ? <InfoNotice>{aviso}</InfoNotice> : null}
    </div>
  );
}