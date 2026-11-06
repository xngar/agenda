"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { OrganizationType, Patient } from "@/lib/ficha/types";
import { fichaFor, ORG_TYPE_LABEL } from "@/lib/ficha/definitions";
import { Card, Button, Field, inputClasses } from "@/components/ui";
import { TruncatedText } from "@/components/ui/truncated-text";
import { FichaCardHeader } from "./panels-shared";
import { formatRut, formatRutPartial, normalizeRut } from "@/lib/rut";
import { formatPhonePartial, normalizePhone } from "@/lib/phone";
import { SpecialtyForm, SpecialtyView, type SpecialtyValues } from "./specialty-section";

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
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">{etiqueta}</dt>
      <dd className="mt-0.5 min-w-0 text-sm text-neutral-900">{valor || "—"}</dd>
    </div>
  );
}

interface FormState {
  full_name: string;
  rut: string;
  phone: string;
  email: string;
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
    full_name: p.full_name ?? "",
    rut: formatRutPartial(p.rut ?? ""),
    phone: formatPhonePartial(p.phone ?? ""),
    email: p.email ?? "",
    birth_date: p.birth_date?.slice(0, 10) ?? "",
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
    emergency_phone: formatPhonePartial(p.emergency_phone ?? ""),
    tutor_name: p.tutor_name ?? "",
    tutor_rut: formatRutPartial(p.tutor_rut ?? ""),
    tutor_relation: p.tutor_relation ?? "",
    tutor_phone: formatPhonePartial(p.tutor_phone ?? ""),
    referral_source: p.referral_source ?? "",
    patient_status: p.patient_status,
  };
}

function empty(v: string): string | null {
  return v.trim() === "" ? null : v.trim();
}

export function ResumenPanel({
  patient,
  orgType,
  canEdit = false,
  canEditProfile = false,
  showClinicalProfile = true,
}: {
  patient: Patient;
  orgType: OrganizationType;
  canEdit?: boolean;
  canEditProfile?: boolean;
  showClinicalProfile?: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<FormState>(() => formFrom(patient));
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resincroniza el formulario cuando llega el paciente actualizado
    setForm(formFrom(patient));
  }, [patient]);

  const ficha = fichaFor(orgType);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfil, setPerfil] = useState<SpecialtyValues>(
    () => ({ ...((patient.specialty_profile as SpecialtyValues | null) ?? {}) }),
  );
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const response = await fetch(`/api/ficha/patients/${patient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: empty(form.full_name) ?? undefined,
          rut: empty(normalizeRut(form.rut)),
          phone: empty(normalizePhone(form.phone)),
          email: empty(form.email),
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
          emergency_phone: empty(normalizePhone(form.emergency_phone)) ?? undefined,
          tutor_name: empty(form.tutor_name) ?? undefined,
          tutor_rut: empty(normalizeRut(form.tutor_rut)) ?? undefined,
          tutor_relation: empty(form.tutor_relation) ?? undefined,
          tutor_phone: empty(normalizePhone(form.tutor_phone)) ?? undefined,
          referral_source: empty(form.referral_source) ?? undefined,
          patient_status: form.patient_status,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "No se pudo guardar la ficha");
        return;
      }
      toast.success("Ficha actualizada");
      setEditando(false);
      router.refresh();
    } catch {
      toast.error("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoPerfil(true);
    try {
      const response = await fetch(`/api/ficha/patients/${patient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialty_profile: perfil }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "No se pudo guardar el perfil de especialidad");
        return;
      }
      toast.success("Perfil de especialidad actualizado");
      setEditandoPerfil(false);
      router.refresh();
    } catch {
      toast.error("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setGuardandoPerfil(false);
    }
  }

  if (editando) {
    return (
      <Card>
        <FichaCardHeader title="Editar datos del paciente" description="Identificación, contacto y previsión" />
        <form onSubmit={guardar} className="space-y-6 px-5 py-5">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-action-primary">Datos personales</legend>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nombre completo" htmlFor="full_name" required>
                <input
                  id="full_name"
                  className={inputClasses}
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                />
              </Field>
              <Field label="RUT" htmlFor="rut" required={false}>
                <input
                  id="rut"
                  className={inputClasses}
                  value={form.rut}
                  placeholder="12.345.678-9"
                  maxLength={16}
                  inputMode="text"
                  onChange={(e) => {
                    const { value, selectionStart } = e.target;
                    const atEnd = selectionStart === null || selectionStart === value.length;
                    set("rut", atEnd ? formatRutPartial(value) : value);
                  }}
                  onBlur={() => setForm((f) => ({ ...f, rut: formatRutPartial(f.rut) }))}
                />
              </Field>
              <Field label="Teléfono" htmlFor="phone" required={false}>
                <input
                  id="phone"
                  className={inputClasses}
                  value={form.phone}
                  placeholder="+56 9 1234 5678"
                  inputMode="tel"
                  onChange={(e) => set("phone", formatPhonePartial(e.target.value))}
                />
                <span className="mt-1 block text-xs text-neutral-500">
                  Escribe sólo el número: el +56 ya está puesto.
                </span>
              </Field>
              <Field label="Correo" htmlFor="email" required={false}>
                <input
                  id="email"
                  className={inputClasses}
                  type="email"
                  value={form.email}
                  placeholder="paciente@correo.cl"
                  onChange={(e) => set("email", e.target.value)}
                />
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
            <legend className="mb-3 text-sm font-semibold text-action-primary">Dirección y previsión</legend>
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
            <legend className="mb-3 text-sm font-semibold text-action-primary">Contacto de emergencia</legend>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Nombre" htmlFor="emergency_name" required={false}>
                <input id="emergency_name" className={inputClasses} value={form.emergency_name} onChange={(e) => set("emergency_name", e.target.value)} />
              </Field>
              <Field label="Parentesco" htmlFor="emergency_relation" required={false}>
                <input id="emergency_relation" className={inputClasses} value={form.emergency_relation} onChange={(e) => set("emergency_relation", e.target.value)} />
              </Field>
              <Field label="Teléfono" htmlFor="emergency_phone" required={false}>
                <input
                  id="emergency_phone"
                  className={inputClasses}
                  value={form.emergency_phone}
                  placeholder="+56 9 1234 5678"
                  inputMode="tel"
                  onChange={(e) => set("emergency_phone", formatPhonePartial(e.target.value))}
                />
                <span className="mt-1 block text-xs text-neutral-500">
                  Escribe sólo el número: el +56 ya está puesto.
                </span>
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-action-primary">Apoderado o tutor</legend>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nombre" htmlFor="tutor_name" required={false}>
                <input id="tutor_name" className={inputClasses} value={form.tutor_name} onChange={(e) => set("tutor_name", e.target.value)} />
              </Field>
              <Field label="RUT" htmlFor="tutor_rut" required={false}>
                <input
                  id="tutor_rut"
                  className={inputClasses}
                  value={form.tutor_rut}
                  placeholder="12.345.678-9"
                  maxLength={16}
                  inputMode="text"
                  onChange={(e) => {
                    const { value, selectionStart } = e.target;
                    const atEnd = selectionStart === null || selectionStart === value.length;
                    set("tutor_rut", atEnd ? formatRutPartial(value) : value);
                  }}
                  onBlur={() => setForm((f) => ({ ...f, tutor_rut: formatRutPartial(f.tutor_rut) }))}
                />
              </Field>
              <Field label="Parentesco" htmlFor="tutor_relation" required={false}>
                <input id="tutor_relation" className={inputClasses} value={form.tutor_relation} onChange={(e) => set("tutor_relation", e.target.value)} />
              </Field>
              <Field label="Teléfono" htmlFor="tutor_phone" required={false}>
                <input
                  id="tutor_phone"
                  className={inputClasses}
                  value={form.tutor_phone}
                  placeholder="+56 9 1234 5678"
                  inputMode="tel"
                  onChange={(e) => set("tutor_phone", formatPhonePartial(e.target.value))}
                />
                <span className="mt-1 block text-xs text-neutral-500">
                  Escribe sólo el número: el +56 ya está puesto.
                </span>
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-action-primary">Registro</legend>
            <Field label="Cómo llegó" htmlFor="referral_source" required={false}>
              <input
                id="referral_source"
                className={inputClasses}
                maxLength={200}
                placeholder="P. ej. Referido por un paciente, redes sociales, Google…"
                value={form.referral_source}
                onChange={(e) => set("referral_source", e.target.value)}
              />
            </Field>
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
      <Card className="anim-row-in" style={{ animationDelay: "0ms" }}>
        <FichaCardHeader
          title="Identificación"
          action={canEdit ? <Button size="sm" variant="secondary" onClick={() => setEditando(true)}>Editar identificación</Button> : undefined}
        />
        <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre completo" valor={patient.full_name} />
          <Campo etiqueta="RUT" valor={patient.rut} />
          <Campo etiqueta="Teléfono" valor={patient.phone} />
          <Campo
            etiqueta="Correo"
            valor={
              patient.email ? (
                <TruncatedText text={patient.email} className="w-full max-w-full" />
              ) : null
            }
          />
          <Campo etiqueta="Fecha de nacimiento" valor={patient.birth_date?.slice(0, 10)} />
          <Campo etiqueta="Sexo" valor={SEXOS.find((s) => s.value === patient.sex)?.label} />
          <Campo etiqueta="Nacionalidad" valor={patient.nationality} />
          <Campo etiqueta="Estado civil" valor={CIVIL.find((c) => c.value === patient.marital_status)?.label} />
          <Campo etiqueta="Ocupación" valor={patient.occupation} />
        </dl>
      </Card>

      <Card className="anim-row-in" style={{ animationDelay: "40ms" }}>
        <FichaCardHeader title="Previsión y contacto" />
        <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Campo etiqueta="Previsión" valor={PREVISION.find((p) => p.value === patient.prevision_type)?.label} />
          <Campo etiqueta="Tramo Fonasa" valor={patient.fonasa_tramo} />
          <Campo etiqueta="Isapre" valor={patient.isapre_name ? `${patient.isapre_name}${patient.isapre_plan ? ` · ${patient.isapre_plan}` : ""}` : null} />
          <Campo etiqueta="Dirección" valor={[patient.address, patient.comuna].filter(Boolean).join(", ")} />
        </dl>
      </Card>

      <Card className="anim-row-in" style={{ animationDelay: "80ms" }}>
        <FichaCardHeader title="Emergencia y apoderado" />
        <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Campo etiqueta="Contacto emergencia" valor={patient.emergency_name ? `${patient.emergency_name} (${patient.emergency_relation ?? ""})` : null} />
          <Campo etiqueta="Teléfono emergencia" valor={patient.emergency_phone ? formatPhonePartial(patient.emergency_phone) : null} />
          <Campo etiqueta="Apoderado/a" valor={patient.tutor_name ? `${patient.tutor_name} (${patient.tutor_relation ?? ""})` : null} />
          <Campo etiqueta="RUT apoderado" valor={patient.tutor_rut ? (formatRut(patient.tutor_rut) ?? patient.tutor_rut) : null} />
          <Campo etiqueta="Teléfono apoderado" valor={patient.tutor_phone ? formatPhonePartial(patient.tutor_phone) : null} />
        </dl>
      </Card>

      <Card className="anim-row-in" style={{ animationDelay: "120ms" }}>
        <FichaCardHeader title="Registro" />
        <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Campo etiqueta="Paciente desde" valor={patient.admitted_at?.slice(0, 10)} />
          <Campo etiqueta="Cómo llegó" valor={patient.referral_source} />
          <Campo etiqueta="Consentimiento" valor={patient.consent_at?.slice(0, 10)} />
          <Campo etiqueta="Tipo de organización" valor={ORG_TYPE_LABEL[orgType]} />
        </dl>
      </Card>

      {showClinicalProfile ? (
        <Card className="anim-row-in" style={{ animationDelay: "160ms" }}>
        <FichaCardHeader
          title={`Perfil ${ficha.label.toLowerCase()}`}
          description="Antecedentes propios de esta especialidad"
          action={
            canEditProfile && !editandoPerfil ? (
              <Button size="sm" variant="secondary" onClick={() => setEditandoPerfil(true)}>
                Editar perfil
              </Button>
            ) : undefined
          }
        />
        {!editandoPerfil &&
        orgType === "dental" &&
        typeof (patient.specialty_profile as SpecialtyValues | null)?.treatmentAlerts === "string" &&
        ((patient.specialty_profile as SpecialtyValues).treatmentAlerts as string).trim() ? (
          <div className="px-5 pt-4" role="alert">
            <p className="rounded-xl border border-warning-200 bg-warning-50 px-3 py-2 text-sm font-medium text-warning-700">
              Alertas para el tratamiento:{" "}
              {((patient.specialty_profile as SpecialtyValues).treatmentAlerts as string).trim()}
            </p>
          </div>
        ) : null}
        {editandoPerfil ? (
          <form onSubmit={guardarPerfil} className="space-y-6 px-5 py-5">
            <SpecialtyForm
              sections={ficha.profileFields}
              value={perfil}
              onChange={(key, next) => setPerfil((p) => ({ ...p, [key]: next }))}
              idPrefix="perfil"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={guardandoPerfil}>
                {guardandoPerfil ? "Guardando…" : "Guardar perfil"}
              </Button>
              <Button variant="ghost" onClick={() => setEditandoPerfil(false)} disabled={guardandoPerfil}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <SpecialtyView
            sections={ficha.profileFields}
            data={(patient.specialty_profile as SpecialtyValues | null) ?? {}}
          />
        )}
      </Card>
      ) : null}

    </div>
  );
}