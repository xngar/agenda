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
import { SkeletonBlock } from "@/components/ui";
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
      className="rounded-card border border-brand-navy bg-brand-navy px-4 py-3 text-white shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">
              {heading}
            </h2>
            <span aria-hidden="true" className="text-white/40">·</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-white">
              <CalendarClock className="h-3.5 w-3.5 text-white/80" aria-hidden="true" />
              {timeRange}
            </span>
            <span aria-hidden="true" className="text-white/40">·</span>
            <span className="text-xs text-white/85">{serviceName}</span>
          </div>

          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="text-base font-bold text-white">{patientName}</span>
            <span className="text-xs text-white/80">
              {rut ? `RUT ${formatRut(rut)}` : "Sin RUT registrado"}
              {summary?.patient.prevision_type ? ` · ${summary.patient.prevision_type}` : ""}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
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
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
          >
            <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
            {isClinical ? "Ver resumen completo" : "Ver ficha administrativa"}
          </button>

          {isClinical ? (
            <Link
              href={`/dashboard/pacientes/${cita.patient_id}`}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-brand-navy shadow-2xs transition-colors hover:bg-neutral-100"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Abrir ficha clínica
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-white/20 bg-transparent px-2 py-1 text-xs font-medium text-white/85 transition-colors hover:bg-white/15 hover:text-white"
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
        <div className="mt-2.5">
          {loading && !summary ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <SkeletonBlock className="h-12 bg-white/15" />
              <SkeletonBlock className="h-12 bg-white/15" />
              <SkeletonBlock className="h-12 bg-white/15" />
            </div>
          ) : isClinical && summary ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {/* Bloque 1: Alertas y alergias */}
              <div
                className={`rounded-lg border px-3 py-2 text-xs ${
                  hasAlerts
                    ? "border-amber-300 bg-amber-50 text-amber-950"
                    : "border-white/15 bg-white/10 text-white/90"
                }`}
              >
                <p className="flex items-center gap-1.5 font-semibold uppercase tracking-wide">
                  <AlertTriangle
                    className={`h-3.5 w-3.5 shrink-0 ${
                      hasAlerts ? "text-amber-700" : "text-white/75"
                    }`}
                    aria-hidden="true"
                  />
                  Alertas y alergias
                </p>
                {hasAlerts ? (
                  <p className="mt-0.5 line-clamp-1">
                    {[
                      summary.patient.treatment_alerts,
                      summary.background?.alergias?.length
                        ? `Alergias: ${summary.background.alergias.join(", ")}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : (
                  <p className="mt-0.5 line-clamp-1 text-white/75">
                    Sin alertas ni alergias registradas.
                  </p>
                )}
              </div>

              {/* Bloque 2: Motivo y medicamentos */}
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/90">
                <p className="flex items-center gap-1.5 font-semibold uppercase tracking-wide text-white">
                  <Pill className="h-3.5 w-3.5 shrink-0 text-white/80" aria-hidden="true" />
                  Antecedentes y fármacos
                </p>
                {summary.background?.motivo_consulta ||
                (summary.background?.medicamentos &&
                  summary.background.medicamentos.length > 0) ||
                summary.background?.antecedentes_medicos ? (
                  <p className="mt-0.5 line-clamp-1 text-white/85">
                    {[
                      summary.background.motivo_consulta
                        ? `Motivo: ${summary.background.motivo_consulta}`
                        : null,
                      summary.background.medicamentos.length > 0
                        ? `Fármacos: ${summary.background.medicamentos
                            .slice(0, 3)
                            .map((m) => (m.detalle ? `${m.nombre} (${m.detalle})` : m.nombre))
                            .join(", ")}`
                        : summary.background.antecedentes_medicos,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : (
                  <p className="mt-0.5 line-clamp-1 text-white/75">
                    Sin antecedentes ni fármacos registrados.
                  </p>
                )}
              </div>

              {/* Bloque 3: Última atención */}
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/90">
                <p className="flex items-center gap-1.5 font-semibold uppercase tracking-wide text-white">
                  <Stethoscope
                    className="h-3.5 w-3.5 shrink-0 text-white/80"
                    aria-hidden="true"
                  />
                  Última atención
                </p>
                {summary.last_encounter ? (
                  <p className="mt-0.5 line-clamp-1 text-white/85">
                    <span className="font-medium text-white">
                      {formatDayKey(summary.last_encounter.started_at)}
                      {summary.last_encounter.care_type
                        ? ` · ${summary.last_encounter.care_type}`
                        : ""}
                    </span>
                    {" — "}
                    {summary.last_encounter.diagnostico ??
                      summary.last_encounter.motivo ??
                      "Atención registrada"}
                  </p>
                ) : (
                  <p className="mt-0.5 line-clamp-1 text-white/75">
                    Primera atención registrada en la clínica.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/90">
              <span className="font-semibold text-white">Datos de contacto:</span>
              <span>
                {phone ? `Teléfono: ${formatPhonePartial(phone)}` : "Sin teléfono registrado"}
                {email ? ` · Correo: ${email}` : ""}
              </span>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
