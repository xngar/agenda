"use client";

import { useCallback, useEffect, useState } from "react";
import type { Encounter, EncounterVersion } from "@/lib/ficha/types";
import {
  Card,
  CardHeader,
  Button,
  ErrorNotice,
  InfoNotice,
  Field,
  Spinner,
  inputClasses,
} from "@/components/ui";

interface EncounterRow extends Encounter {
  doctors?: { full_name: string } | null;
}

interface VersionRow extends EncounterVersion {
  doctors?: { full_name: string } | null;
}

const CARE_TYPES = [
  { value: "primera_consulta", label: "Primera consulta" },
  { value: "control", label: "Control" },
  { value: "urgencia", label: "Urgencia" },
  { value: "procedimiento", label: "Procedimiento" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "otro", label: "Otro" },
];

interface FormState {
  started_at: string;
  care_type: string;
  motivo: string;
  evolucion: string;
  diagnostico: string;
  indicaciones: string;
  proxima_cita_at: string;
}

const EMPTY_FORM: FormState = {
  started_at: new Date().toISOString().slice(0, 10),
  care_type: "",
  motivo: "",
  evolucion: "",
  diagnostico: "",
  indicaciones: "",
  proxima_cita_at: "",
};

function formFrom(e: Encounter): FormState {
  return {
    started_at: e.started_at?.slice(0, 10) ?? "",
    care_type: e.care_type ?? "",
    motivo: e.motivo ?? "",
    evolucion: e.evolucion ?? "",
    diagnostico: e.diagnostico ?? "",
    indicaciones: e.indicaciones ?? "",
    proxima_cita_at: e.proxima_cita_at?.slice(0, 10) ?? "",
  };
}

function careLabel(v: string): string {
  return CARE_TYPES.find((c) => c.value === v)?.label ?? v;
}

export function AtencionesPanel({ patientId }: { patientId: string }) {
  const [encounters, setEncounters] = useState<EncounterRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<"nueva" | EncounterRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [guardando, setGuardando] = useState(false);
  const [firmando, setFirmando] = useState<string | null>(null);
  const [versionesDe, setVersionesDe] = useState<string | null>(null);
  const [versiones, setVersiones] = useState<VersionRow[]>([]);
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);
  const [razon, setRazon] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/encounters`);
      const data = (await response.json()) as { encounters?: EncounterRow[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudieron cargar las atenciones");
        return;
      }
      setEncounters(data.encounters ?? []);
    } catch {
      setError("No pudimos conectarnos.");
    }
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, setState tras await
    cargar();
  }, [cargar]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function abrirNueva() {
    setForm({ ...EMPTY_FORM, started_at: new Date().toISOString().slice(0, 10) });
    setDialogo("nueva");
    setError(null);
  }

  function abrirEditar(e: EncounterRow) {
    setForm(formFrom(e));
    setDialogo(e);
    setError(null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setGuardando(true);
    try {
      const payload = {
        started_at: form.started_at || undefined,
        care_type: form.care_type.trim() || null,
        motivo: form.motivo.trim() || undefined,
        evolucion: form.evolucion.trim() || undefined,
        diagnostico: form.diagnostico.trim() || undefined,
        indicaciones: form.indicaciones.trim() || undefined,
        proxima_cita_at: form.proxima_cita_at || null,
      };
      const response =
        dialogo === "nueva"
          ? await fetch(`/api/ficha/patients/${patientId}/encounters`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/ficha/encounters/${(dialogo as EncounterRow).id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ patient_id: patientId, ...payload }),
            });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la atención");
        return;
      }
      setAviso(dialogo === "nueva" ? "Atención registrada." : "Atención actualizada.");
      setDialogo(null);
      cargar();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function firmar(e: EncounterRow) {
    setFirmando(e.id);
    setError(null);
    setAviso(null);
    try {
      const response = await fetch(`/api/ficha/encounters/${e.id}`, { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo firmar la atención");
        return;
      }
      setAviso("Atención firmada. Desde ahora es inmutable; las correcciones quedan en el historial.");
      cargar();
    } catch {
      setError("No pudimos conectarnos.");
    } finally {
      setFirmando(null);
    }
  }

  async function verVersiones(e: EncounterRow) {
    if (versionesDe === e.id) {
      setVersionesDe(null);
      setVersiones([]);
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/ficha/encounters/${e.id}/versions`);
      const data = (await response.json()) as { versions?: VersionRow[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudieron cargar las versiones");
        return;
      }
      setVersionesDe(e.id);
      setVersiones(data.versions ?? []);
    } catch {
      setError("No pudimos conectarnos.");
    }
  }

  async function corregir(e: React.FormEvent) {
    e.preventDefault();
    if (!corrigiendo || razon.trim().length < 3) return;
    setGuardando(true);
    setError(null);
    try {
      const response = await fetch(`/api/ficha/encounters/${corrigiendo}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: razon.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo registrar la corrección");
        return;
      }
      setAviso("Corrección registrada en el historial.");
      setCorrigiendo(null);
      setRazon("");
      verVersiones(encounters?.find((en) => en.id === corrigiendo) as EncounterRow);
    } catch {
      setError("No pudimos conectarnos.");
    } finally {
      setGuardando(false);
    }
  }

  if (encounters === null) {
    return (
      <Card>
        <CardHeader title="Atenciones" />
        <div className="px-5 py-8">
          <Spinner label="Cargando atenciones…" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorNotice message={error} /> : null}
      {aviso ? <InfoNotice>{aviso}</InfoNotice> : null}

      <Card>
        <CardHeader
          title="Atenciones"
          description="Los borradores se pueden editar; al firmar la atención queda inmutable."
          action={<Button size="sm" variant="secondary" onClick={abrirNueva}>Nueva atención</Button>}
        />
        <ul className="divide-y divide-neutral-100">
          {encounters.length === 0 ? (
            <li className="px-5 py-8 text-sm text-neutral-500">Sin atenciones registradas.</li>
          ) : (
            encounters.map((e) => (
              <li key={e.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">
                      {e.started_at?.slice(0, 10) ?? "Sin fecha"} · {careLabel(e.care_type ?? "Atención")}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {e.motivo || "Sin motivo indicado"} · {e.doctors?.full_name ?? "Profesional"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        e.status === "signed" ? "bg-lime-100 text-lime-800" : "bg-brand-sky-100 text-brand-navy-900"
                      }`}
                    >
                      {e.status === "signed" ? "Firmada" : "Borrador"}
                    </span>
                    {e.status === "draft" ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => abrirEditar(e)}>Editar</Button>
                        <Button size="sm" onClick={() => firmar(e)} disabled={firmando === e.id}>
                          {firmando === e.id ? "Firmando…" : "Firmar"}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => verVersiones(e)}>
                        {versionesDe === e.id ? "Ocultar historial" : "Historial"}
                      </Button>
                    )}
                  </div>
                </div>

                {e.status === "signed" ? (
                  <div className="mt-3 grid gap-2 rounded-xl bg-neutral-50 p-3 text-sm sm:grid-cols-2">
                    {e.evolucion ? (
                      <div>
                        <p className="font-semibold text-neutral-700">Evolución</p>
                        <p className="whitespace-pre-wrap text-neutral-800">{e.evolucion}</p>
                      </div>
                    ) : null}
                    {e.diagnostico ? (
                      <div>
                        <p className="font-semibold text-neutral-700">Diagnóstico</p>
                        <p className="whitespace-pre-wrap text-neutral-800">{e.diagnostico}</p>
                      </div>
                    ) : null}
                    {e.indicaciones ? (
                      <div>
                        <p className="font-semibold text-neutral-700">Indicaciones</p>
                        <p className="whitespace-pre-wrap text-neutral-800">{e.indicaciones}</p>
                      </div>
                    ) : null}
                    {e.proxima_cita_at ? (
                      <div>
                        <p className="font-semibold text-neutral-700">Próxima cita</p>
                        <p className="text-neutral-800">{e.proxima_cita_at.slice(0, 10)}</p>
                      </div>
                    ) : null}
                    <div className="sm:col-span-2">
                      <p className="text-xs text-neutral-500">
                        Firmada {e.signed_at ? new Date(e.signed_at).toLocaleString("es-CL") : ""}
                      </p>
                    </div>
                  </div>
                ) : null}

                {versionesDe === e.id ? (
                  <div className="mt-3 space-y-2">
                    {versiones.length === 0 ? (
                      <p className="text-sm text-neutral-500">Sin versiones registradas.</p>
                    ) : (
                      versiones.map((v) => (
                        <div key={v.id} className="rounded-xl border border-neutral-200 bg-white p-3 text-sm">
                          <p className="font-medium text-neutral-800">
                            {new Date(v.created_at).toLocaleString("es-CL")} · {v.reason}
                          </p>
                          <p className="text-xs text-neutral-500">
                            Autor: {v.doctors?.full_name ?? v.author_id}
                          </p>
                        </div>
                      ))
                    )}
                    <Button size="sm" variant="secondary" onClick={() => setCorrigiendo(corrigiendo === e.id ? null : e.id)}>
                      {corrigiendo === e.id ? "Cancelar" : "Registrar corrección"}
                    </Button>
                    {corrigiendo === e.id ? (
                      <form onSubmit={corregir} className="flex flex-wrap items-end gap-3 rounded-xl bg-neutral-50 p-3">
                        <label className="block flex-1">
                          <span className="mb-1 block text-xs font-medium text-neutral-600">Motivo de la corrección</span>
                          <input
                            className={inputClasses}
                            value={razon}
                            placeholder="P. ej. se corrige diagnóstico"
                            onChange={(e) => setRazon(e.target.value)}
                          />
                        </label>
                        <Button type="submit" size="sm" disabled={guardando || razon.trim().length < 3}>
                          Guardar
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </Card>

      {dialogo ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-900/40 p-4" onClick={() => setDialogo(null)}>
          <div
            className="w-full max-w-2xl rounded-card border border-neutral-200 bg-white shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader
              title={dialogo === "nueva" ? "Nueva atención" : "Editar borrador"}
              description="Registra la atención. Mientras sea borrador puedes editarla; al firmarla queda inmutable."
            />
            <form onSubmit={guardar} className="space-y-4 px-5 py-5">
              {error ? <ErrorNotice message={error} /> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Fecha de atención" htmlFor="started_at">
                  <input id="started_at" type="date" className={inputClasses} value={form.started_at} onChange={(e) => set("started_at", e.target.value)} />
                </Field>
                <Field label="Tipo de atención" htmlFor="care_type" required={false}>
                  <select id="care_type" className={inputClasses} value={form.care_type} onChange={(e) => set("care_type", e.target.value)}>
                    <option value="">—</option>
                    {CARE_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Motivo" htmlFor="motivo" required={false}>
                <textarea id="motivo" rows={2} className={inputClasses} value={form.motivo} onChange={(e) => set("motivo", e.target.value)} />
              </Field>
              <Field label="Evolución" htmlFor="evolucion" required={false}>
                <textarea id="evolucion" rows={4} className={inputClasses} value={form.evolucion} onChange={(e) => set("evolucion", e.target.value)} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Diagnóstico" htmlFor="diagnostico" required={false}>
                  <textarea id="diagnostico" rows={3} className={inputClasses} value={form.diagnostico} onChange={(e) => set("diagnostico", e.target.value)} />
                </Field>
                <Field label="Indicaciones" htmlFor="indicaciones" required={false}>
                  <textarea id="indicaciones" rows={3} className={inputClasses} value={form.indicaciones} onChange={(e) => set("indicaciones", e.target.value)} />
                </Field>
              </div>
              <Field label="Próxima cita" htmlFor="proxima" required={false}>
                <input id="proxima" type="date" className={inputClasses} value={form.proxima_cita_at} onChange={(e) => set("proxima_cita_at", e.target.value)} />
              </Field>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : dialogosGuardar(dialogo)}</Button>
                <Button variant="ghost" onClick={() => setDialogo(null)} disabled={guardando}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );

  function dialogosGuardar(d: "nueva" | EncounterRow): string {
    return d === "nueva" ? "Guardar atención" : "Actualizar atención";
  }
}