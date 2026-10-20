"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "cn";
import type { StatsKpi, StatsSnapshot } from "@/lib/stats/types";

const EJE = "#3a6fb8";
const GRID = "rgba(15,23,42,0.08)";
const SIN_DATO = "rgba(15,23,42,0.08)";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function formatearCorto(valor: number, maxEnteros: number): string {
  return valor.toLocaleString("es-CL", { maximumFractionDigits: maxEnteros });
}

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearKpi(valor: number, unit: StatsKpi["unit"]): string {
  switch (unit) {
    case "pct":
      return `${formatearCorto(valor, 1)}%`;
    case "hours":
      return `${formatearCorto(valor, 1)} h`;
    case "currency":
      return formatearMoneda(valor);
    default:
      return formatearCorto(valor, 0);
  }
}

function deltaChip(kpi: StatsKpi): { texto: string; positivo: boolean } | null {
  const color = (subio: boolean) => (kpi.goodDown ? !subio : subio);
  if (kpi.deltaPct !== null) {
    const signo = kpi.deltaPct > 0 ? "+" : "";
    return { texto: `${signo}${formatearCorto(kpi.deltaPct, 1)}%`, positivo: color(kpi.deltaPct > 0) };
  }
  if (kpi.deltaPoints !== null) {
    const signo = kpi.deltaPoints > 0 ? "+" : "";
    return {
      texto: `${signo}${formatearCorto(kpi.deltaPoints, 1)} pts`,
      positivo: color(kpi.deltaPoints > 0),
    };
  }
  return null;
}

function KpiCards({ kpis }: { kpis: StatsKpi[] }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const delta = deltaChip(kpi);
        return (
          <div
            key={kpi.key}
            className="rounded-card border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
          >
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {kpi.label}
              </dt>
              {delta ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                    delta.positivo ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                  )}
                >
                  {delta.texto}
                </span>
              ) : null}
            </div>
            <dd className="mt-2">
              <span className="text-2xl font-semibold tabular-nums text-brand-navy">
                {kpi.current === null ? "—" : formatearKpi(kpi.current, kpi.unit)}
              </span>
            </dd>
            <p className="mt-1 text-xs text-neutral-500">
              {kpi.previous === null
                ? "Sin datos del periodo anterior"
                : `${formatearKpi(kpi.previous, kpi.unit)} el periodo anterior`}
            </p>
            {kpi.hint ? <p className="mt-1 text-[11px] text-neutral-400">{kpi.hint}</p> : null}
          </div>
        );
      })}
    </dl>
  );
}

function CitasChart({ daily }: { daily: StatsSnapshot["daily"] }) {
  const data = useMemo(
    () => daily.map((row) => ({ ...row, etiqueta: row.day.slice(5) })),
    [daily],
  );

  const conDatos = data.some((row) => row.total > 0);

  return (
    <section className="rounded-card border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
      <h2 className="text-sm font-semibold text-neutral-800">Citas por día</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Total (barras), atendidas, no-show y canceladas del periodo.
      </p>
      {conDatos ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="etiqueta"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                width={40}
                allowDecimals={false}
              />
              <Tooltip
                labelFormatter={(label) => `Día ${String(label)}`}
                contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid rgba(15,23,42,0.1)" }}
              />
              <Bar dataKey="total" name="Total" maxBarSize={38}>
                {data.map((row) => (
                  <Cell key={row.day} fill={row.total === 0 ? SIN_DATO : EJE} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="completadas" name="Atendidas" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="no_shows" name="No-show" stroke="#f43f5e" strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="canceladas"
                name="Canceladas"
                stroke="#f59e0b"
                strokeWidth={1.6}
                dot={false}
                strokeDasharray="5 3"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-lg bg-neutral-50 p-6 text-center text-sm text-neutral-500">
          Sin citas en el periodo seleccionado.
        </p>
      )}
    </section>
  );
}

function OcupacionChart({ snapshot }: { snapshot: StatsSnapshot }) {
  const ocup = snapshot.kpis.find((k) => k.key === "ocupacion");
  const ocupacion = ocup?.current ?? null;
  const ocupacionPrevia = ocup?.previous ?? null;

  if (ocupacion === null) {
    return (
      <section className="rounded-card border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
        <h2 className="text-sm font-semibold text-neutral-800">Ocupación de la agenda</h2>
        <p className="rounded-lg bg-neutral-50 p-6 text-center text-sm text-neutral-500">
          Configura el horario del equipo para calcular la ocupación.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
      <h2 className="text-sm font-semibold text-neutral-800">Ocupación de la agenda</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Horas agendadas ÷ horas disponibles según el horario configurado.
      </p>
      <div className="flex h-8 overflow-hidden rounded-lg bg-neutral-100" role="img">
        <div
          style={{ width: `${Math.min(100, Math.max(0, ocupacion))}%` }}
          className="flex items-center justify-end bg-brand-navy pr-2 text-[11px] font-semibold text-white"
        >
          {formatearCorto(ocupacion, 1)}%
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-600">
        <span>
          {snapshot.horasAgendadas === null
            ? "—"
            : `${formatearCorto(snapshot.horasAgendadas, 1)} h`}{" "}
          agendadas
        </span>
        <span>
          Periodo anterior:{" "}
          <span className="font-medium tabular-nums">
            {ocupacionPrevia === null ? "—" : `${formatearCorto(ocupacionPrevia, 1)}%`}
          </span>
        </span>
      </div>
    </section>
  );
}

function PacientesChart({
  patients,
  inactivos,
}: {
  patients: StatsSnapshot["patients"];
  inactivos: number;
}) {
  const data = useMemo(
    () => patients.map((row) => ({ ...row, etiqueta: row.mes.slice(0, 7).replace("-", "/") })),
    [patients],
  );
  const conDatos = data.some((row) => row.nuevos > 0 || row.recurrentes > 0);

  return (
    <section className="rounded-card border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
      <h2 className="text-sm font-semibold text-neutral-800">Pacientes por mes</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Nuevos: su primera cita. Recurrentes: más de una cita dentro del mes.
      </p>
      {conDatos ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="etiqueta"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                width={40}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid rgba(15,23,42,0.1)" }}
              />
              <Bar dataKey="nuevos" stackId="pacientes" name="Nuevos" fill={EJE} maxBarSize={40} />
              <Bar
                dataKey="recurrentes"
                stackId="pacientes"
                name="Recurrentes"
                fill="rgba(58,111,184,0.4)"
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-lg bg-neutral-50 p-6 text-center text-sm text-neutral-500">
          Sin pacientes en el periodo.
        </p>
      )}
      <p className="mt-3 border-t border-neutral-100 pt-2 text-xs text-neutral-600">
        <span className="tabular-nums font-medium">{inactivos.toLocaleString("es-CL")}</span>{" "}
        paciente{inactivos === 1 ? "" : "s"} sin citas hace más de 6 meses.
      </p>
    </section>
  );
}

function ServiciosChart({ services }: { services: StatsSnapshot["services"] }) {
  const conDatos = services.some((s) => s.total > 0);
  const top = useMemo(() => services.slice(0, 10), [services]);

  return (
    <section className="rounded-card border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
      <h2 className="text-sm font-semibold text-neutral-800">Servicios más agendados</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Conteo de citas e ingreso estimado (sólo atenciones no canceladas).
      </p>
      {conDatos ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ top: 6, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="service_name"
                width={140}
                tick={{ fontSize: 11, fill: "#374151" }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
              />
              <Tooltip
                formatter={(valor) => formatearCorto(Number(valor), 0)}
                contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid rgba(15,23,42,0.1)" }}
              />
              <Bar dataKey="total" name="Citas" fill={EJE} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-lg bg-neutral-50 p-6 text-center text-sm text-neutral-500">
          Sin servicios agendados en el periodo.
        </p>
      )}
      {services.some((s) => (s.ingreso ?? 0) > 0) ? (
        <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-2 text-xs text-neutral-600">
          <li className="font-medium text-neutral-700">Ingreso estimado</li>
          {services
            .filter((s) => (s.ingreso ?? 0) > 0)
            .slice(0, 5)
            .map((s) => (
              <li key={s.service_name} className="flex justify-between gap-2">
                <span className="truncate">{s.service_name}</span>
                <span className="tabular-nums">{formatearMoneda(s.ingreso ?? 0)}</span>
              </li>
            ))}
        </ul>
      ) : null}
    </section>
  );
}

function Heatmap({ heatmap }: { heatmap: StatsSnapshot["heatmap"] }) {
  const mapa = useMemo(() => new Map(heatmap.map((r) => [`${r.dow}-${r.hora}`, r.total])), [heatmap]);
  const max = Math.max(1, ...heatmap.map((r) => r.total));
  const horas = useMemo(
    () => [...new Set(heatmap.map((r) => r.hora))].sort((a, b) => a - b),
    [heatmap],
  );

  return (
    <section className="rounded-card border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
      <h2 className="text-sm font-semibold text-neutral-800">Distribución de citas</h2>
      <p className="mb-4 text-xs text-neutral-500">Densidad por día de la semana y hora local.</p>
      {horas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-1 text-center text-[11px]">
            <thead>
              <tr>
                <th scope="col" className="w-12" />
                {horas.map((hora) => (
                  <th key={hora} scope="col" className="p-1 font-medium tabular-nums text-neutral-500">
                    {`${hora}`.padStart(2, "0")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DIAS_SEMANA.map((nombre, indice) => {
                const dow = indice + 1;
                const filaVacia = horas.every((hora) => (mapa.get(`${dow}-${hora}`) ?? 0) === 0);
                return (
                  <tr key={nombre} className={filaVacia ? "opacity-40" : undefined}>
                    <th scope="row" className="text-right font-medium text-neutral-500">
                      {nombre}
                    </th>
                    {horas.map((hora) => {
                      const valor = mapa.get(`${dow}-${hora}`) ?? 0;
                      const intensidad = valor / max;
                      return (
                        <td
                          key={hora}
                          className="h-7 w-10 rounded"
                          style={{ backgroundColor: `rgba(58,111,184,${0.06 + 0.85 * intensidad})` }}
                          title={`${nombre} ${hora}:00 — ${valor} ${valor === 1 ? "cita" : "citas"}`}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg bg-neutral-50 p-6 text-center text-sm text-neutral-500">
          Sin citas en el periodo para armar el mapa.
        </p>
      )}
    </section>
  );
}

export function EstadisticasView({
  snapshot,
  periodoLabel,
  periodoPrevioLabel,
}: {
  snapshot: StatsSnapshot;
  periodoLabel: string;
  periodoPrevioLabel: string;
}) {
  const conDatos = snapshot.kpis.some((k) => (k.current ?? 0) > 0);

  return (
    <div className="space-y-6">
      <p className="text-xs text-neutral-500">
        Comparando <span className="font-medium text-neutral-700">{periodoLabel}</span> contra{" "}
        <span className="font-medium text-neutral-700">{periodoPrevioLabel}</span>.
      </p>
      {!conDatos ? (
        <div className="rounded-card border border-dashed border-neutral-300 bg-white/70 p-8 text-center">
          <p className="text-sm font-medium text-neutral-700">Sin actividad en el periodo</p>
          <p className="mt-1 text-xs text-neutral-500">
            Prueba con un rango más amplio o cambia el profesional seleccionado.
          </p>
        </div>
      ) : null}
      <KpiCards kpis={snapshot.kpis} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CitasChart daily={snapshot.daily} />
        <OcupacionChart snapshot={snapshot} />
        <PacientesChart patients={snapshot.patients} inactivos={snapshot.inactivePatients} />
        <ServiciosChart services={snapshot.services} />
      </div>
      <Heatmap heatmap={snapshot.heatmap} />
    </div>
  );
}
