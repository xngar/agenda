"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuditAction, AuditEntry } from "@/lib/ficha/types";
import {
  AUDIT_ACCIONES,
  AUDIT_ENTIDADES,
  AUDIT_ENTIDADES_PACIENTE,
} from "@/lib/ficha/audit-view";
import { Card, CardHeader, ErrorNotice, Spinner, inputClasses } from "@/components/ui";

const PAGE_SIZE = 20;

const ENTIDADES_PACIENTE = Object.entries(AUDIT_ENTIDADES).filter(([valor]) =>
  AUDIT_ENTIDADES_PACIENTE.includes(valor),
);

const FECHA_HORA = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Santiago",
});

const ACCION_BADGE: Record<AuditAction, string> = {
  insert: "border-success-200 bg-success-50 text-success-700",
  update: "border-brand-sky-200 bg-brand-sky-50 text-brand-navy-700",
  delete: "border-danger-200 bg-danger-50 text-danger-700",
  sign: "border-brand-navy-200 bg-brand-navy-50 text-brand-navy-800",
  export: "border-warning-200 bg-warning-50 text-warning-700",
  view: "border-neutral-200 bg-neutral-100 text-neutral-600",
  contact: "border-success-200 bg-success-50 text-success-700",
};

interface AuditRow extends AuditEntry {
  actor_name?: string | null;
  detalle?: string;
}

interface RespuestaAuditoria {
  entries?: AuditRow[];
  total?: number;
  error?: string;
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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [accion, setAccion] = useState("");
  const [entidad, setEntidad] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const peticion = useRef(0);

  const cargar = useCallback(
    async (pagina: number, accionValor: string, entidadValor: string) => {
      const id = ++peticion.current;
      setCargando(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          patient_id: patientId,
          limit: String(PAGE_SIZE),
          offset: String((pagina - 1) * PAGE_SIZE),
        });
        if (accionValor) params.set("action", accionValor);
        if (entidadValor) params.set("entity", entidadValor);

        const response = await fetch(`/api/ficha/audit?${params.toString()}`);
        if (id !== peticion.current) return;

        const data = (await response.json()) as RespuestaAuditoria;
        if (!response.ok) {
          setError(data.error ?? "No se pudo cargar la auditoría");
          return;
        }
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      } catch {
        if (id === peticion.current) setError("No pudimos conectarnos.");
      } finally {
        if (id === peticion.current) setCargando(false);
      }
    },
    [patientId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch al montar/cambiar filtros; setState tras await
    cargar(page, accion, entidad);
  }, [cargar, page, accion, entidad]);

  useEffect(() => {
    return () => {
      peticion.current += 1;
    };
  }, []);

  if (entries === null) {
    return (
      <Card>
        <CardHeader title="Auditoría" />
        <div className="px-5 py-8">
          {error ? <ErrorNotice message={error} /> : <Spinner label="Cargando auditoría…" />}
        </div>
      </Card>
    );
  }

  const exporta = isAdmin || puedeExportar;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const desde = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const hasta = Math.min(page * PAGE_SIZE, total);
  const filtrado = accion !== "" || entidad !== "";

  const hrefExport = (format: "json" | "csv") => {
    const params = new URLSearchParams({ patient_id: patientId, format });
    if (accion) params.set("action", accion);
    if (entidad) params.set("entity", entidad);
    return `/api/ficha/audit?${params.toString()}`;
  };

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
                  className="inline-flex min-h-9 items-center rounded-xl border border-brand-navy-200 bg-transparent px-3 text-sm font-semibold text-brand-navy hover:border-action-primary/40 hover:bg-action-primary/5 hover:text-action-primary"
                  href={`/api/ficha/patients/${patientId}/export`}
                  download
                  title="Descargar los datos de la ficha en JSON"
                >
                  Ficha (JSON)
                </a>
                <a
                  className="inline-flex min-h-9 items-center rounded-xl border border-brand-navy-200 bg-transparent px-3 text-sm font-semibold text-brand-navy hover:border-action-primary/40 hover:bg-action-primary/5 hover:text-action-primary"
                  href={hrefExport("json")}
                  download
                  title="Descargar todo el historial de cambios en JSON"
                >
                  Historial (JSON)
                </a>
                <a
                  className="inline-flex min-h-9 items-center rounded-xl border border-brand-navy-200 bg-transparent px-3 text-sm font-semibold text-brand-navy hover:border-action-primary/40 hover:bg-action-primary/5 hover:text-action-primary"
                  href={hrefExport("csv")}
                  download
                  title="Descargar todo el historial de cambios en CSV"
                >
                  Historial (CSV)
                </a>
              </div>
            ) : undefined
          }
        />

        <div className="flex flex-wrap items-end gap-3 border-b border-neutral-100 px-5 py-3">
          <label className="w-full sm:w-52">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Acción</span>
            <select
              name="accion"
              className={`${inputClasses} min-h-10 py-1.5`}
              value={accion}
              onChange={(e) => {
                setAccion(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas las acciones</option>
              {Object.entries(AUDIT_ACCIONES).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>
          <label className="w-full sm:w-52">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Entidad</span>
            <select
              name="entidad"
              className={`${inputClasses} min-h-10 py-1.5`}
              value={entidad}
              onChange={(e) => {
                setEntidad(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas las entidades</option>
              {ENTIDADES_PACIENTE.map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>
          {cargando ? (
            <span className="sm:ml-auto">
              <Spinner label="Actualizando…" />
            </span>
          ) : null}
        </div>

        {entries.length === 0 ? (
          <p className="px-5 py-8 text-sm text-neutral-500">
            {filtrado
              ? "Ningún evento coincide con los filtros."
              : "Sin movimientos registrados."}
          </p>
        ) : (
          <div
            aria-busy={cargando}
            className={cargando ? "opacity-60 transition-opacity" : "transition-opacity"}
          >
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-sm">
                <caption className="sr-only">
                  Historial de auditoría de la ficha del paciente
                </caption>
                <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Fecha
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Acción
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Entidad
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Detalle
                    </th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Autor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {entries.map((e) => (
                    <tr key={e.id} className="align-top transition-colors hover:bg-action-primary/5">
                      <td className="whitespace-nowrap px-5 py-3 text-neutral-600">
                        {FECHA_HORA.format(new Date(String(e.created_at)))}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                            ACCION_BADGE[e.action] ?? ACCION_BADGE.view
                          }`}
                        >
                          {AUDIT_ACCIONES[e.action] ?? e.action}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {AUDIT_ENTIDADES[e.entity] ?? e.entity}
                      </td>
                      <td className="px-3 py-3 text-neutral-800">
                        {e.detalle ? e.detalle : "—"}
                      </td>
                      <td className="px-5 py-3 text-neutral-600">
                        {e.actor_name ?? "Sistema"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-neutral-100 md:hidden">
              {entries.map((e) => (
                <li key={e.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                        ACCION_BADGE[e.action] ?? ACCION_BADGE.view
                      }`}
                    >
                      {AUDIT_ACCIONES[e.action] ?? e.action}
                    </span>
                    <p className="text-xs text-neutral-500">
                      {FECHA_HORA.format(new Date(String(e.created_at)))}
                    </p>
                  </div>
                  <p className="mt-1 text-sm font-medium text-neutral-900">
                    {AUDIT_ENTIDADES[e.entity] ?? e.entity}
                  </p>
                  {e.detalle ? (
                    <p className="text-sm text-neutral-800">{e.detalle}</p>
                  ) : null}
                  <p className="text-xs text-neutral-500">{e.actor_name ?? "Sistema"}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <nav
          aria-label="Paginación de auditoría"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3"
        >
          <p className="text-sm text-neutral-600">
            {total === 0 ? "Sin eventos" : `Mostrando ${desde}–${hasta} de ${total}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || cargando}
              className="rounded-lg border border-brand-navy-200 px-3 py-1.5 text-sm font-medium text-brand-navy-700 transition-colors hover:border-action-primary/40 hover:bg-action-primary/5 hover:text-action-primary disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400"
            >
              ‹ Anterior
            </button>
            <span className="text-sm text-neutral-600">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || cargando}
              className="rounded-lg border border-brand-navy-200 px-3 py-1.5 text-sm font-medium text-brand-navy-700 transition-colors hover:border-action-primary/40 hover:bg-action-primary/5 hover:text-action-primary disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400"
            >
              Siguiente ›
            </button>
          </div>
        </nav>
      </Card>
    </div>
  );
}
