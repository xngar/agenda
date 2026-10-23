"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Prescription } from "@/lib/ficha/types";
import { Card, Button, ErrorNotice, Field, Spinner, inputClasses } from "@/components/ui";
import { FichaCardHeader } from "./panels-shared";

interface EncounterOption {
  id: string;
  started_at: string;
  care_type: string | null;
  doctors?: { full_name: string } | null;
}

interface PrescriptionRecord extends Prescription {
  prescriber?: { full_name: string } | null;
  encounter?: { started_at: string; care_type: string | null } | null;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  });
}

export function RecetasPanel({ patientId }: { patientId: string }) {
  const [recetas, setRecetas] = useState<PrescriptionRecord[] | null>(null);
  const [encounters, setEncounters] = useState<EncounterOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const [form, setForm] = useState({
    medication: "",
    dose: "",
    route: "",
    frequency: "",
    duration: "",
    encounter_id: "",
  });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/prescriptions`);
      const data = (await response.json()) as {
        prescriptions?: PrescriptionRecord[];
        encounters?: EncounterOption[];
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "No se pudieron cargar las indicaciones");
        return;
      }
      setRecetas(data.prescriptions ?? []);
      setEncounters(data.encounters ?? []);
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
    setGuardando(true);
    try {
      const response = await fetch(`/api/ficha/patients/${patientId}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          encounter_id: form.encounter_id || null,
          medication: form.medication.trim(),
          dose: form.dose.trim(),
          route: form.route.trim() || null,
          frequency: form.frequency.trim() || null,
          duration: form.duration.trim() || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo registrar la indicación");
        return;
      }
      toast.success("Indicación registrada");
      setNueva(false);
      setForm({ medication: "", dose: "", route: "", frequency: "", duration: "", encounter_id: "" });
      await cargar();
    } catch {
      setError("No pudimos conectarnos.");
    } finally {
      setGuardando(false);
    }
  }

  if (recetas === null) {
    return (
      <Card>
        <FichaCardHeader title="Registro de indicaciones" />
        <div className="px-5 py-8">
          {error ? (
            <div className="space-y-3">
              <ErrorNotice message={error} />
              <Button variant="secondary" onClick={() => void cargar()}>Reintentar</Button>
            </div>
          ) : (
            <Spinner label="Cargando indicaciones…" />
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
          title="Registro de indicaciones"
          description="Registro clínico de medicamentos indicados por el profesional. No genera una receta formal ni un documento para dispensación."
          action={<Button size="sm" variant="secondary" onClick={() => setNueva(!nueva)}>{nueva ? "Cancelar" : "Nueva indicación"}</Button>}
        />
        {nueva ? (
          <form onSubmit={guardar} className="space-y-4 border-t border-neutral-200 px-5 py-4">
            <Field label="Atención asociada" htmlFor="prescription-encounter" required={false}>
              <select
                id="prescription-encounter"
                className={inputClasses}
                value={form.encounter_id}
                onChange={(e) => setForm((f) => ({ ...f, encounter_id: e.target.value }))}
              >
                <option value="">Sin atención asociada</option>
                {encounters.map((encounter) => (
                  <option key={encounter.id} value={encounter.id}>
                    {formatDateTime(encounter.started_at)} · {encounter.care_type || "Atención"}
                    {encounter.doctors?.full_name ? ` · ${encounter.doctors.full_name}` : ""}
                  </option>
                ))}
              </select>
            </Field>
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
              {guardando ? "Guardando…" : "Guardar indicación"}
            </Button>
          </form>
        ) : null}

        <ul className="divide-y divide-neutral-100">
          {recetas.length === 0 ? (
            <li className="px-5 py-8 text-sm text-neutral-500">Sin indicaciones registradas.</li>
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
                <p className="mt-1 text-xs text-neutral-500">
                  Registrada {formatDateTime(r.created_at)} · {r.prescriber?.full_name ?? "Profesional no identificado"}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {r.encounter
                    ? `Atención: ${formatDateTime(r.encounter.started_at)} · ${r.encounter.care_type || "Atención"}`
                    : "Sin atención asociada"}
                </p>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}