"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PatientMedicalBackground } from "@/lib/ficha/types";
import { Card, CardHeader, Button, ErrorNotice, InfoNotice, Field, inputClasses } from "@/components/ui";

interface FormState {
  motivo_consulta: string;
  antecedentes_medicos: string;
  medicamentos: string;
  alergias: string;
  antecedentes_familiares: string;
  fuma: boolean;
  alcohol: boolean;
  ejercicio: boolean;
  otro_habito: string;
  embarazo_lactancia: string;
}

function parseMedicamentos(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [nombre, ...resto] = l.split(";");
      return { nombre: nombre.trim(), detalle: resto.join(";").trim() || undefined };
    })
    .filter((m) => m.nombre);
}

function backgroundFrom(b: PatientMedicalBackground | null): FormState {
  return {
    motivo_consulta: b?.motivo_consulta ?? "",
    antecedentes_medicos: b?.antecedentes_medicos ?? "",
    medicamentos: (b?.medicamentos ?? []).map((m) => `${m.nombre}${m.detalle ? `; ${m.detalle}` : ""}`).join("\n"),
    alergias: (b?.alergias ?? []).join(", "),
    antecedentes_familiares: b?.antecedentes_familiares ?? "",
    fuma: Boolean(b?.habitos?.["fuma"]),
    alcohol: Boolean(b?.habitos?.["alcohol"]),
    ejercicio: Boolean(b?.habitos?.["ejercicio"]),
    otro_habito: typeof b?.habitos?.["otro"] === "string" ? b.habitos["otro"] : "",
    embarazo_lactancia: b?.embarazo_lactancia === null ? "" : b?.embarazo_lactancia ? "si" : "no",
  };
}

export function AntecedentesPanel({
  patientId,
  initial,
}: {
  patientId: string;
  initial: PatientMedicalBackground | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => backgroundFrom(initial));
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setGuardando(true);
    try {
      const habitos: Record<string, string | boolean> = {
        fuma: form.fuma,
        alcohol: form.alcohol,
        ejercicio: form.ejercicio,
      };
      if (form.otro_habito.trim()) habitos["otro"] = form.otro_habito.trim();

      const embarazo_lactancia = form.embarazo_lactancia === "" ? null : form.embarazo_lactancia === "si";

      const response = await fetch(`/api/ficha/patients/${patientId}/background`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          motivo_consulta: form.motivo_consulta.trim() || undefined,
          antecedentes_medicos: form.antecedentes_medicos.trim() || undefined,
          medicamentos: parseMedicamentos(form.medicamentos),
          alergias: form.alergias
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
          antecedentes_familiares: form.antecedentes_familiares.trim() || undefined,
          habitos,
          embarazo_lactancia,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudieron guardar los antecedentes");
        return;
      }
      setAviso("Antecedentes guardados");
      setGuardado(true);
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorNotice message={error} /> : null}
      {aviso ? <InfoNotice>{aviso}</InfoNotice> : null}
      {guardado ? (
        <p className="text-sm text-neutral-600">
          Antecedentes guardados con fecha de actualización {new Date().toLocaleDateString("es-CL")}.
        </p>
      ) : null}

      <Card>
        <CardHeader title="Antecedentes clínicos" description="Información general previa a la atención" />
        <form onSubmit={guardar} className="space-y-5 px-5 py-5">
          <Field label="Motivo de consulta o derivación" htmlFor="motivo" required={false}>
            <textarea id="motivo" rows={3} className={inputClasses} value={form.motivo_consulta} onChange={(e) => set("motivo_consulta", e.target.value)} />
          </Field>
          <Field label="Antecedentes médicos" htmlFor="antecedentes" hint="Enfermedades, operaciones u otros datos relevantes" required={false}>
            <textarea id="antecedentes" rows={4} className={inputClasses} value={form.antecedentes_medicos} onChange={(e) => set("antecedentes_medicos", e.target.value)} />
          </Field>
          <Field label="Medicamentos" htmlFor="medicamentos" hint="Uno por línea: nombre; detalle (dosis, frecuencia…)" required={false}>
            <textarea id="medicamentos" rows={4} className={inputClasses} value={form.medicamentos} onChange={(e) => set("medicamentos", e.target.value)} />
          </Field>
          <Field label="Alergias" htmlFor="alergias" hint="Separadas por coma, p. ej.: penicilina, látex" required={false}>
            <input id="alergias" className={inputClasses} value={form.alergias} onChange={(e) => set("alergias", e.target.value)} />
          </Field>
          <Field label="Antecedentes familiares" htmlFor="familiares" required={false}>
            <textarea id="familiares" rows={3} className={inputClasses} value={form.antecedentes_familiares} onChange={(e) => set("antecedentes_familiares", e.target.value)} />
          </Field>

          <fieldset>
            <legend className="text-sm font-medium text-neutral-800">Hábitos</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              {(
                [
                  ["fuma", "Fuma"],
                  ["alcohol", "Alcohol"],
                  ["ejercicio", "Ejercicio"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" checked={form[key]} onChange={(e) => set(key, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-2">
              <Field label="Otro hábito" htmlFor="otro" required={false}>
                <input id="otro" className={inputClasses} value={form.otro_habito} onChange={(e) => set("otro_habito", e.target.value)} />
              </Field>
            </div>
          </fieldset>

          <Field label="Embarazo o lactancia (aplica a mujeres)" htmlFor="embarazo" required={false}>
            <select id="embarazo" className={inputClasses} value={form.embarazo_lactancia} onChange={(e) => set("embarazo_lactancia", e.target.value)}>
              <option value="">No informado</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </Field>

          <div>
            <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar antecedentes"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}