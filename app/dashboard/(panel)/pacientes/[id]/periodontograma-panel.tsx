"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { PeriodontalRecord } from "@/lib/ficha/types";
import {
  DECIDUOUS_LOWER,
  DECIDUOUS_UPPER,
  PERMANENT_LOWER,
  PERMANENT_UPPER,
} from "@/lib/ficha/dental";
import { Card, Button, ErrorNotice, Field, Spinner, inputClasses } from "@/components/ui";
import { todayKey } from "@/lib/dates";
import { FichaCardHeader } from "./panels-shared";

const SITIOS = [
  { key: "mv", label: "MV" },
  { key: "v", label: "V" },
  { key: "dv", label: "DV" },
  { key: "ml", label: "ML" },
  { key: "l", label: "L" },
  { key: "dl", label: "DL" },
] as const;

const DIENTES = [
  ...PERMANENT_UPPER,
  ...PERMANENT_LOWER,
  ...DECIDUOUS_UPPER,
  ...DECIDUOUS_LOWER,
];

interface FormState {
  tooth: string;
  recorded_at: string;
  depths: Record<string, string>;
  bleeding: boolean;
  recession: string;
  mobility: string;
  furcation: string;
  diagnosis: string;
}

function emptyForm(): FormState {
  return {
    tooth: String(PERMANENT_UPPER[0]),
    recorded_at: todayKey(),
    depths: Object.fromEntries(SITIOS.map((s) => [s.key, ""])),
    bleeding: false,
    recession: "",
    mobility: "0",
    furcation: "",
    diagnosis: "",
  };
}

function sitiosTexto(record: PeriodontalRecord): string {
  return SITIOS.map((s) => {
    const valor = record.depths?.[s.key]?.[0];
    return `${s.label} ${valor ?? "–"}`;
  }).join(" · ");
}

export function PeriodontogramaPanel({ patientId }: { patientId: string }) {
  const [records, setRecords] = useState<PeriodontalRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/periodontal`);
      const data = (await response.json()) as { records?: PeriodontalRecord[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudieron cargar los registros periodontales");
        return;
      }
      setRecords(data.records ?? []);
    } catch {
      setError("No pudimos conectarnos.");
    }
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, setState tras await
    void cargar();
  }, [cargar]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setSitio(key: string, value: string) {
    setForm((f) => ({ ...f, depths: { ...f.depths, [key]: value } }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const depths: Record<string, number[]> = {};
    for (const sitio of SITIOS) {
      const raw = form.depths[sitio.key].trim();
      if (!raw) continue;
      const valor = Number(raw);
      if (!Number.isInteger(valor) || valor < 0 || valor > 15) {
        setError("Las profundidades deben ser números enteros entre 0 y 15 mm");
        return;
      }
      depths[sitio.key] = [valor];
    }

    let recession: number | null = null;
    if (form.recession.trim() !== "") {
      recession = Number(form.recession);
      if (!Number.isInteger(recession) || recession < 0 || recession > 10) {
        setError("La recesión debe ser un número entre 0 y 10 mm");
        return;
      }
    }

    const mobility = Number(form.mobility);
    if (!Number.isInteger(mobility) || mobility < 0 || mobility > 3) {
      setError("La movilidad debe estar entre 0 y 3");
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/periodontal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tooth: Number(form.tooth),
          depths,
          bleeding_on_probing: form.bleeding,
          recession,
          mobility,
          furcation: form.furcation.trim() || null,
          diagnosis: form.diagnosis.trim() || null,
          recorded_at: form.recorded_at || undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el registro periodontal");
        return;
      }
      toast.success("Registro periodontal guardado");
      setAbierto(false);
      setForm(emptyForm());
      await cargar();
    } catch {
      setError("No pudimos conectarnos.");
    } finally {
      setGuardando(false);
    }
  }

  if (records === null) {
    return (
      <Card>
        <FichaCardHeader title="Periodoncia" />
        <div className="px-5 py-8">
          <Spinner label="Cargando registros periodontales…" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        <FichaCardHeader
          title="Periodoncia"
          description="Sondaje, sangrado, recesión y movilidad por pieza."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setAbierto((v) => !v);
                setError(null);
              }}
            >
              {abierto ? "Cancelar" : "Registrar sondaje"}
            </Button>
          }
        />

        {abierto ? (
          <form onSubmit={guardar} className="space-y-4 border-t border-neutral-200 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Pieza (FDI)" htmlFor="perio-tooth">
                <select
                  id="perio-tooth"
                  className={inputClasses}
                  value={form.tooth}
                  onChange={(e) => set("tooth", e.target.value)}
                >
                  {DIENTES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha" htmlFor="perio-date">
                <input
                  id="perio-date"
                  type="date"
                  className={inputClasses}
                  value={form.recorded_at}
                  onChange={(e) => set("recorded_at", e.target.value)}
                />
              </Field>
              <Field label="Movilidad (0–3)" htmlFor="perio-mobility">
                <select
                  id="perio-mobility"
                  className={inputClasses}
                  value={form.mobility}
                  onChange={(e) => set("mobility", e.target.value)}
                >
                  {[0, 1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-neutral-700">
                Profundidad de sondaje (mm)
              </legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SITIOS.map((s) => (
                  <Field key={s.key} label={s.label} htmlFor={`perio-${s.key}`} required={false}>
                    <input
                      id={`perio-${s.key}`}
                      type="number"
                      min={0}
                      max={15}
                      inputMode="numeric"
                      className={inputClasses}
                      value={form.depths[s.key]}
                      onChange={(e) => setSitio(s.key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Recesión (mm)" htmlFor="perio-recession" required={false}>
                <input
                  id="perio-recession"
                  type="number"
                  min={0}
                  max={10}
                  inputMode="numeric"
                  className={inputClasses}
                  value={form.recession}
                  onChange={(e) => set("recession", e.target.value)}
                />
              </Field>
              <Field label="Furcación" htmlFor="perio-furcation" required={false}>
                <input
                  id="perio-furcation"
                  className={inputClasses}
                  value={form.furcation}
                  onChange={(e) => set("furcation", e.target.value)}
                  placeholder="Grado I, II, III…"
                />
              </Field>
              <label className="flex items-end gap-2 pb-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  className="size-4 rounded border-neutral-300"
                  checked={form.bleeding}
                  onChange={(e) => set("bleeding", e.target.checked)}
                />
                Sangrado al sondaje
              </label>
            </div>

            <Field label="Diagnóstico" htmlFor="perio-diagnosis" required={false}>
              <textarea
                id="perio-diagnosis"
                rows={2}
                className={inputClasses}
                value={form.diagnosis}
                onChange={(e) => set("diagnosis", e.target.value)}
              />
            </Field>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar registro"}
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      <Card>
        <FichaCardHeader
          title="Historial periodontal"
          description={`${records.length} registro${records.length === 1 ? "" : "s"}`}
        />
        {records.length === 0 ? (
          <p className="px-5 py-6 text-sm text-neutral-500">
            Aún no hay sondajes registrados para este paciente.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-y border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Fecha</th>
                  <th className="px-4 py-2 font-semibold">Pieza</th>
                  <th className="px-4 py-2 font-semibold">Sitios (mm)</th>
                  <th className="px-4 py-2 font-semibold">Sangrado</th>
                  <th className="px-4 py-2 font-semibold">Recesión</th>
                  <th className="px-4 py-2 font-semibold">Movilidad</th>
                  <th className="px-4 py-2 font-semibold">Diagnóstico</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2 text-neutral-600">{r.recorded_at?.slice(0, 10)}</td>
                    <td className="px-4 py-2 font-medium">{r.tooth}</td>
                    <td className="px-4 py-2 text-neutral-600">{sitiosTexto(r)}</td>
                    <td className="px-4 py-2">{r.bleeding_on_probing ? "Sí" : "No"}</td>
                    <td className="px-4 py-2">{r.recession ?? "–"}</td>
                    <td className="px-4 py-2">{r.mobility}</td>
                    <td className="px-4 py-2 text-neutral-600">
                      {[r.furcation, r.diagnosis].filter(Boolean).join(" · ") || "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
