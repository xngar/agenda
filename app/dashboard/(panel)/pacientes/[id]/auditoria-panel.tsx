"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/ficha/types";
import { Card, CardHeader, ErrorNotice, Spinner } from "@/components/ui";

const ACCIONES: Record<string, string> = {
  insert: "Creación",
  update: "Edición",
  delete: "Eliminación",
  sign: "Firma",
  export: "Exportación",
  view: "Lectura",
};

const ENTIDADES: Record<string, string> = {
  patients: "Paciente",
  encounters: "Atención",
  encounter_versions: "Versión",
  dental_chart_entries: "Odontograma",
  dental_treatment_plan_items: "Plan",
  prescriptions: "Receta",
  consents: "Consentimiento",
  attachments: "Adjunto",
  patient_medical_background: "Antecedentes",
};

export function AuditoriaPanel({ patientId, isAdmin }: { patientId: string; isAdmin?: boolean }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/ficha/audit?entity_id=${encodeURIComponent(patientId)}&limit=100`,
      );
      const data = (await response.json()) as { entries?: AuditEntry[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo cargar la auditoría");
        return;
      }
      setEntries(data.entries ?? []);
    } catch {
      setError("No pudimos conectarnos.");
    }
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, setState tras await
    cargar();
  }, [cargar]);

  if (entries === null) {
    return (
      <Card>
        <CardHeader title="Auditoría" />
        <div className="px-5 py-8">
          <Spinner label="Cargando auditoría…" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorNotice message={error} /> : null}
      <Card>
        <CardHeader
          title="Historial de auditoría"
          description="Registro de cambios sobre los datos de esta ficha (creación, edición, firma, exportación)."
          action={
            isAdmin ? (
              <div className="flex flex-wrap gap-2">
                <a
                  className="inline-flex min-h-9 items-center rounded-xl border border-brand-navy-200 bg-transparent px-3 text-sm font-semibold text-brand-navy hover:bg-brand-navy-50"
                  href={`/api/ficha/audit?entity_id=${encodeURIComponent(patientId)}&limit=500&format=json`}
                  download
                >
                  Exportar JSON
                </a>
                <a
                  className="inline-flex min-h-9 items-center rounded-xl border border-brand-navy-200 bg-transparent px-3 text-sm font-semibold text-brand-navy hover:bg-brand-navy-50"
                  href={`/api/ficha/audit?entity_id=${encodeURIComponent(patientId)}&limit=500&format=csv`}
                  download
                >
                  Exportar CSV
                </a>
              </div>
            ) : undefined
          }
        />
        <ul className="divide-y divide-neutral-100">
          {entries.length === 0 ? (
            <li className="px-5 py-8 text-sm text-neutral-500">Sin movimientos registrados.</li>
          ) : (
            entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">
                    {(ACCIONES[e.action] ?? e.action) + " · " + (ENTIDADES[e.entity] ?? e.entity)}
                  </p>
                  <p className="truncate text-sm text-neutral-600">
                    {JSON.stringify(e.summary ?? {}).slice(0, 160) || "—"}
                  </p>
                </div>
                <p className="shrink-0 text-sm text-neutral-500">
                  {new Date(e.created_at).toLocaleString("es-CL")}
                </p>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}