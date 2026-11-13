"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Pill,
  Stethoscope,
} from "lucide-react";
import type { DoctorAppointment } from "@/lib/types";
import type { PatientSummary } from "@/lib/ficha/summary-types";
import { parseAppointmentRange } from "@/lib/range";
import { formatDayKey, formatTime } from "@/lib/dates";
import { formatPhonePartial } from "@/lib/phone";
import { formatRut } from "@/lib/rut";
import { SkeletonBlock, StatusBadge, buttonClasses } from "@/components/ui";
import {
  prefetchPatientSummary,
  usePatientQuickView,
} from "@/components/dashboard/patient-quick-view";

interface NextAppointmentMatch {
  cita: DoctorAppointment;
  start: string;
  end: string;
  estadoTemporal: "en_curso" | "proxima";
}

function selectNextAppointment(
  citas: DoctorAppointment[],
  dayKey: string,
  todayKey: string,
): NextAppointmentMatch | null {
  if (dayKey < todayKey) return null;

  const now = Date.now();
  const candidates = citas
    .filter((c) => (c.status === "confirmed" || c.status === "pending") && Boolean(c.patient_id))
    .map((cita) => {
      const { start, end } = parseAppointmentRange(cita.during);
      return { cita, start, end };
    })
    .filter((item): item is { cita: DoctorAppointment; start: string; end: string } =>
      Boolean(item.start && item.end),
    )
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  if (candidates.length === 0) return null;

  if (dayKey === todayKey) {
    const active = candidates.find((item) => new Date(item.end).getTime() > now);
    if (!active) return null;
    const isRunning = new Date(active.start).getTime() <= now;
    return {
      ...active,
      estadoTemporal: isRunning ? "en_curso" : "proxima",
    };
  }

  return {
    ...candidates[0],
    estadoTemporal: "proxima",
  };
}

export function NextPatientCard({
  citas,
  dayKey,
  todayKey,
  timezone,
}: {
  citas: DoctorAppointment[];
  dayKey: string;
  todayKey: string;
  timezone?: string;
}) {
  const { open } = usePatientQuickView();
  const [collapsed, setCollapsed] = useState(false);

  const match = useMemo(
    () => selectNextAppointment(citas, dayKey, todayKey),
    [citas, dayKey, todayKey],
  );

  const targetPatientId = match?.cita.patient_id ?? null;

  const [loaded, setLoaded] = useState<{
    patientId: string;
    summary: PatientSummary | null;
  } | null>(null);

  useEffect(() => {
    if (!targetPatientId) return;

    let active = true;
    prefetchPatientSummary(targetPatientId).then((result) => {
      if (!active) return;
      setLoaded({ patientId: targetPatientId, summary: result });
    });

    return () => {
      active = false;
    };
  }, [targetPatientId]);

  if (!match) return null;

  const { cita, start, end, estadoTemporal } = match;
  const summary =
    loaded && loaded.patientId === targetPatientId ? loaded.summary : null;
  const loading =
    Boolean(targetPatientId) && (!loaded || loaded.patientId !== targetPatientId);

  const patientName = summary?.patient.full_name ?? cita.patient?.full_name ?? "Paciente";
  const rut = summary?.patient.rut ?? cita.patient?.rut ?? null;
  const phone = summary?.patient.phone ?? cita.patient?.phone ?? null;
  const email = summary?.patient.email ?? cita.patient?.email ?? null;
  const serviceName = cita.service?.name ?? "Atención";

  const timeRange = `${formatTime(start, timezone)} – ${formatTime(end, timezone)}`;
  const heading =
    estadoTemporal === "en_curso" ? "Paciente en atención" : "Próximo paciente a atender";

  const isClinical = summary?.scope === "clinical";
  const hasAlerts =
    Boolean(summary?.patient.treatment_alerts) ||
    Boolean(summary?.background?.alergias && summary.background.alergias.length > 0);

  return (
    <section
      aria-label={heading}
      className="rounded-card border border-neutral-200 bg-white shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-action-primary">{heading}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-neutral-600">
            <span className="inline-flex items-center gap-1 font-medium tabular-nums text-neutral-800">
              <CalendarClock className="h-3.5 w-3.5 text-action-primary" aria-hidden="true" />
              {timeRange}
            </span>
            <span aria-hidden="true">·</span>
            <span>{serviceName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={cita.status} />
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          >
            {collapsed ? (
              <>
                Mostrar <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            ) : (
              <>
                Ocultar <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>

      {!collapsed ? (
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="text-lg font-bold text-neutral-900">{patientName}</p>
              <p className="text-xs text-neutral-600">
                {rut ? `RUT ${formatRut(rut)}` : "Sin RUT registrado"}
                {summary?.patient.prevision_type ? ` · ${summary.patient.prevision_type}` : ""}
              </p>
            </div>
          </div>

          {loading && !summary ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </div>
          ) : isClinical && summary ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Bloque 1: Alertas y alergias */}
              <div
                className={`rounded-xl border p-3.5 ${
                  hasAlerts
                    ? "border-amber-300 bg-amber-50/70 text-amber-950"
                    : "border-neutral-200 bg-neutral-50 text-neutral-700"
                }`}
              >
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                  <AlertTriangle
                    className={`h-3.5 w-3.5 shrink-0 ${
                      hasAlerts ? "text-amber-700" : "text-neutral-500"
                    }`}
                    aria-hidden="true"
                  />
                  Alertas y alergias
                </p>
                {hasAlerts ? (
                  <div className="mt-1.5 space-y-1 text-xs leading-relaxed">
                    {summary.patient.treatment_alerts ? (
                      <p className="font-semibold">{summary.patient.treatment_alerts}</p>
                    ) : null}
                    {summary.background?.alergias && summary.background.alergias.length > 0 ? (
                      <p>Alergias: {summary.background.alergias.join(", ")}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-neutral-600">
                    Sin alertas clínicas ni alergias registradas.
                  </p>
                )}
              </div>

              {/* Bloque 2: Motivo y medicamentos */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-neutral-700">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-700">
                  <Pill className="h-3.5 w-3.5 shrink-0 text-action-primary" aria-hidden="true" />
                  Antecedentes y fármacos
                </p>
                {summary.background?.motivo_consulta ||
                (summary.background?.medicamentos &&
                  summary.background.medicamentos.length > 0) ||
                summary.background?.antecedentes_medicos ? (
                  <div className="mt-1.5 space-y-1 text-xs leading-relaxed">
                    {summary.background.motivo_consulta ? (
                      <p className="line-clamp-2">
                        <span className="font-medium text-neutral-900">Motivo:</span>{" "}
                        {summary.background.motivo_consulta}
                      </p>
                    ) : null}
                    {summary.background.medicamentos.length > 0 ? (
                      <p className="line-clamp-2">
                        <span className="font-medium text-neutral-900">Fármacos:</span>{" "}
                        {summary.background.medicamentos
                          .slice(0, 3)
                          .map((m) => (m.detalle ? `${m.nombre} (${m.detalle})` : m.nombre))
                          .join(", ")}
                      </p>
                    ) : summary.background.antecedentes_medicos ? (
                      <p className="line-clamp-2">{summary.background.antecedentes_medicos}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-neutral-600">
                    Sin antecedentes ni medicamentos registrados.
                  </p>
                )}
              </div>

              {/* Bloque 3: Última atención */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-neutral-700">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-700">
                  <Stethoscope
                    className="h-3.5 w-3.5 shrink-0 text-action-primary"
                    aria-hidden="true"
                  />
                  Última atención
                </p>
                {summary.last_encounter ? (
                  <div className="mt-1.5 space-y-1 text-xs leading-relaxed">
                    <p className="font-medium text-neutral-900">
                      {formatDayKey(summary.last_encounter.started_at)}
                      {summary.last_encounter.care_type
                        ? ` · ${summary.last_encounter.care_type}`
                        : ""}
                    </p>
                    <p className="line-clamp-2 text-neutral-600">
                      {summary.last_encounter.diagnostico ??
                        summary.last_encounter.motivo ??
                        "Atención registrada sin detalle breve."}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-neutral-600">
                    Primera atención registrada en la clínica.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs text-neutral-700">
              <p className="font-semibold text-neutral-800">Datos de contacto</p>
              <p className="mt-1 text-neutral-600">
                {phone ? `Teléfono: ${formatPhonePartial(phone)}` : "Sin teléfono registrado"}
                {email ? ` · Correo: ${email}` : ""}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() =>
                open(cita.patient_id, {
                  start,
                  end,
                  serviceName,
                  status: cita.status,
                  patient: {
                    id: cita.patient_id,
                    full_name: patientName,
                    phone,
                    email,
                    rut,
                  },
                })
              }
              className={buttonClasses("ghost", "sm")}
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              {isClinical ? "Ver resumen completo" : "Ver ficha administrativa"}
            </button>

            {isClinical ? (
              <Link
                href={`/dashboard/pacientes/${cita.patient_id}`}
                className={buttonClasses("primary", "sm")}
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Abrir ficha clínica
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
