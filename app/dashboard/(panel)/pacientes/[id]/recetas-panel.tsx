"use client";

import { useCallback, useEffect, useState } from "react";
import type { Prescription } from "@/lib/ficha/types";
import { Card, CardHeader, Button, ErrorNotice, InfoNotice, Field, Spinner, inputClasses } from "@/components/ui";

export function RecetasPanel({ patientId }: { patientId: string }) {
  const [recetas, setRecetas] = useState<Prescription[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const [form, setForm] = useState({ medication: "", dose: "", route: "", frequency: "", duration: "" });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/prescriptions`);
      const data = (await response.json()) as { prescriptions?: Prescription[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudieron cargar las recetas");
        return;
      }
      setRecetas(data.prescriptions ?? []);
    } catch {
      setError("No pudimos conectarnos.");
    }
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, setState tras await
    cargar();
  }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setGuardando(true);
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          medication: form.medication.trim(),
          dose: form.dose.trim(),
          route: form.route.trim() || null,
          frequency: form.frequency.trim() || null,
          duration: form.duration.trim() || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la receta");
        return;
      }
      setAviso("Receta registrada.");
      setNueva(false);
      setForm({ medication: "", dose: "", route: "", frequency: "", duration: "" });
      cargar();
    } catch {
      setError("No pudimos conectarnos.");
    } finally {
      setGuardando(false);
    }
  }

  if (recetas === null) {
    return (
      <Card>
        <CardHeader title="Recetas" />
        <div className="px-5 py-8">
          <Spinner label="Cargando recetas…" />
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
          title="Recetas"
          description="Indicaciones de medicamentos entregadas durante la atención."
          action={<Button size="sm" variant="secondary" onClick={() => setNueva(!nueva)}>{nueva ? "Cancelar" : "Nueva receta"}</Button>}
        />
        {nueva ? (
          <form onSubmit={guardar} className="space-y-4 border-t border-neutral-200 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Medicamento" htmlFor="medication">
                <input id="medication" className={inputClasses} value={form.medication} onChange={(e) => setForm((f) => ({ ...f, medication: e.target.value }))} placeholder="P. ej. Amoxicilina 500 mg" />
              </Field>
              <Field label="Dosis" htmlFor="dose">
                <input id="dose" className={inputClasses} value={form.dose} onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))} placeholder="P. ej. 1 cápsula" />
              </Field>
              <Field label="Vía" htmlFor="route" required={false}>
                <input id="route" className={inputClasses} value={form.route} onChange={(e) => setForm((f) => ({ ...f, route: e.target.value }))} placeholder="Oral" />
              </Field>
              <Field label="Frecuencia" htmlFor="frequency" required={false}>
                <input id="frequency" className={inputClasses} value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} placeholder="P. ej. cada 8 horas" />
              </Field>
              <Field label="Duración" htmlFor="duration" required={false}>
                <input id="duration" className={inputClasses} value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="P. ej. 7 días" />
              </Field>
            </div>
            <Button type="submit" disabled={guardando || !form.medication.trim() || !form.dose.trim()}>
              {guardando ? "Guardando…" : "Guardar receta"}
            </Button>
          </form>
        ) : null}

        <ul className="divide-y divide-neutral-100">
          {recetas.length === 0 ? (
            <li className="px-5 py-8 text-sm text-neutral-500">Sin recetas registradas.</li>
          ) : (
            recetas.map((r) => (
              <li key={r.id} className="px-5 py-4">
                <p className="font-medium text-neutral-900">{r.medication}</p>
                <p className="text-sm text-neutral-600">
                  {r.dose}
                  {r.route ? ` · ${r.route}` : ""}
                  {r.frequency ? ` · cada ${r.frequency.toLowerCase()}` : ""}
                  {r.duration ? ` · por ${r.duration.toLowerCase()}` : ""}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {new Date(r.created_at).toLocaleString("es-CL")}
                </p>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}