"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/ficha/types";
import { AUDIT_ACCIONES, AUDIT_ENTIDADES } from "@/lib/ficha/audit-view";
import { Card, CardHeader, ErrorNotice, Spinner } from "@/components/ui";

interface AuditRow extends AuditEntry {
  actor_name?: string | null;
  detalle?: string;
}

export function AuditoriaPanel({
  patientId,
  isAdmin,
  puedeExportar = false,
}: {
  patientId: string;
  isAdmin?: boolean;
  puedeExportar?: boolean;
}) {
  const [entries, setEntries] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/ficha/audit?patient_id=${encodeURIComponent(patientId)}&limit=100`,
      );
      const data = (await response.json()) as { entries?: AuditRow[]; error?: string };
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

  const exporta = isAdmin || puedeExportar;

  return (
    <div className="space-y-4">
      {error ? <ErrorNotice message={error} /> : null}
      <Card>
        <CardHeader
          title="Historial de auditoría"
          description="Quién hizo qué y cuándo sobre esta ficha: creaciones, ediciones, firmas y exportaciones."
          action={
            exporta ? (
              <div className="flex flex-wrap gap-2">
                <a
                  className="inline-flex min-h-9 items-center rounded-xl border border-brand-navy-200 bg-transparent px-3 text-sm font-semibold text-brand-navy hover:bg-brand-navy-50"
                  href={`/api/ficha/audit?patient_id=${encodeURIComponent(patientId)}&limit=200&format=json`}
                  download
                >
                  Exportar JSON
                </a>
                <a
                  className="inline-flex min-h-9 items-center rounded-xl border border-brand-navy-200 bg-transparent px-3 text-sm font-semibold text-brand-navy hover:bg-brand-navy-50"
                  href={`/api/ficha/audit?patient_id=${encodeURIComponent(patientId)}&limit=200&format=csv`}
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
                    {(AUDIT_ACCIONES[e.action] ?? e.action) +
                      " · " +
                      (AUDIT_ENTIDADES[e.entity] ?? e.entity)}
                  </p>
                  {e.detalle ? (
                    <p className="truncate text-sm text-neutral-800">{e.detalle}</p>
                  ) : null}
                  <p className="truncate text-xs text-neutral-500">
                    {e.actor_name ?? "Sistema"}
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
