import "server-only";

import { supabaseServer } from "@/lib/supabase/server";
import type {
  StatsDailyRow,
  StatsHeatmapRow,
  StatsKpi,
  StatsKpisRaw,
  StatsPatientsRow,
  StatsRange,
  StatsServicesRow,
  StatsSnapshot,
} from "./types";

interface FetchStatsOptions {
  range: StatsRange;
  previousRange: StatsRange;
  doctorId: string | null;
}

function difPct(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function difPoints(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return Math.round((current - previous) * 10) / 10;
}

async function fetchKpis(
  p_from: string,
  p_to: string,
  p_doctor: string | null,
): Promise<StatsKpisRaw> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("stats_kpis", {
    p_from,
    p_to,
    p_doctor: p_doctor ?? undefined,
  });
  if (error) throw new Error(error.message);
  return (data ?? {}) as StatsKpisRaw;
}

/**
 * Carga agregada del periodo y su comparación contra el periodo anterior de
 * la misma duración, más las series. La autorización la deja RLS; las
 * funciones también fijan el alcance con `stats_doctor_filter`.
 */
export async function fetchStatsSnapshot(options: FetchStatsOptions): Promise<StatsSnapshot> {
  const { range, previousRange, doctorId } = options;
  const supabase = await supabaseServer();

  const [currentRes, previousRes, dailyRes, patientsRes, servicesRes, heatmapRes, inactiveRes] =
    await Promise.all([
      fetchKpis(range.from, range.to, doctorId),
      fetchKpis(previousRange.from, previousRange.to, doctorId),
      supabase.rpc("stats_daily", {
        p_from: range.from,
        p_to: range.to,
        p_doctor: doctorId ?? undefined,
      }),
      supabase.rpc("stats_patients", {
        p_from: range.from,
        p_to: range.to,
        p_doctor: doctorId ?? undefined,
      }),
      supabase.rpc("stats_services", {
        p_from: range.from,
        p_to: range.to,
        p_doctor: doctorId ?? undefined,
      }),
      supabase.rpc("stats_heatmap", {
        p_from: range.from,
        p_to: range.to,
        p_doctor: doctorId ?? undefined,
      }),
      supabase.rpc("stats_inactive_patients", {
        p_months: 6,
        p_doctor: doctorId ?? undefined,
      }),
    ]);

  if (dailyRes.error) throw new Error(dailyRes.error.message);
  if (patientsRes.error) throw new Error(patientsRes.error.message);
  if (servicesRes.error) throw new Error(servicesRes.error.message);
  if (heatmapRes.error) throw new Error(heatmapRes.error.message);
  if (inactiveRes.error) throw new Error(inactiveRes.error.message);

  const daily = (dailyRes.data ?? []) as StatsDailyRow[];
  const patients = (patientsRes.data ?? []) as StatsPatientsRow[];
  const services = (servicesRes.data ?? []) as StatsServicesRow[];
  const heatmap = (heatmapRes.data ?? []) as StatsHeatmapRow[];
  const inactivePatients =
    typeof inactiveRes.data === "number" ? inactiveRes.data : Number(inactiveRes.data ?? 0);

  const empty: StatsKpisRaw = {
    citas: 0,
    horas_agendadas: 0,
    ocupacion: null,
    inasistencia: null,
    canceladas_paciente: 0,
    canceladas_profesional: 0,
    canceladas_tardias: 0,
    pacientes_nuevos: 0,
    pacientes_recurrentes: 0,
    ingreso_perdido: 0,
    precios_configurados: false,
  };
  const current = { ...empty, ...currentRes };
  const previous = { ...empty, ...previousRes };

  const kpis: StatsKpi[] = [
    {
      key: "citas",
      label: "Citas del periodo",
      current: current.citas,
      previous: previous.citas,
      deltaPct: difPct(current.citas, previous.citas),
      deltaPoints: null,
      unit: "count",
    },
    {
      key: "ocupacion",
      label: "Ocupación de la agenda",
      hint: "Horas agendadas ÷ horas disponibles según el horario configurado",
      current: current.ocupacion,
      previous: previous.ocupacion,
      deltaPct: null,
      deltaPoints: difPoints(current.ocupacion, previous.ocupacion),
      unit: "pct",
    },
    {
      key: "inasistencia",
      label: "Inasistencia",
      hint: "Citas marcadas no_show ÷ (atendidas + no_show)",
      current: current.inasistencia,
      previous: previous.inasistencia,
      deltaPct: null,
      deltaPoints: difPoints(current.inasistencia, previous.inasistencia),
      unit: "pct",
      goodDown: true,
    },
    {
      key: "canceladas_paciente",
      label: "Canceladas por paciente",
      current: current.canceladas_paciente,
      previous: previous.canceladas_paciente,
      deltaPct: difPct(current.canceladas_paciente, previous.canceladas_paciente),
      deltaPoints: null,
      unit: "count",
      goodDown: true,
    },
    {
      key: "canceladas_profesional",
      label: "Canceladas por profesional",
      current: current.canceladas_profesional,
      previous: previous.canceladas_profesional,
      deltaPct: difPct(current.canceladas_profesional, previous.canceladas_profesional),
      deltaPoints: null,
      unit: "count",
      goodDown: true,
    },
    {
      key: "canceladas_tardias",
      label: "Cancelaciones tardías",
      hint: "Con menos de 24 h de anticipación",
      current: current.canceladas_tardias,
      previous: previous.canceladas_tardias,
      deltaPct: difPct(current.canceladas_tardias, previous.canceladas_tardias),
      deltaPoints: null,
      unit: "count",
      goodDown: true,
    },
    {
      key: "pacientes_nuevos",
      label: "Pacientes nuevos",
      hint: "Primera cita dentro del periodo",
      current: current.pacientes_nuevos,
      previous: previous.pacientes_nuevos,
      deltaPct: difPct(current.pacientes_nuevos, previous.pacientes_nuevos),
      deltaPoints: null,
      unit: "count",
    },
    {
      key: "pacientes_recurrentes",
      label: "Pacientes que vuelven",
      hint: "Tenían citas antes del periodo y volvieron en él",
      current: current.pacientes_recurrentes,
      previous: previous.pacientes_recurrentes,
      deltaPct: difPct(current.pacientes_recurrentes, previous.pacientes_recurrentes),
      deltaPoints: null,
      unit: "count",
    },
  ];

  if (current.precios_configurados) {
    kpis.push({
      key: "ingreso_perdido",
      label: "Ingreso perdido",
      hint: "Precio de no-shows y cancelaciones con menos de 24 h (estimado)",
      current: current.ingreso_perdido,
      previous: previous.ingreso_perdido,
      deltaPct: difPct(current.ingreso_perdido, previous.ingreso_perdido),
      deltaPoints: null,
      unit: "currency",
      goodDown: true,
    });
  }

  return {
    range,
    previousRange,
    doctorId,
    kpis,
    daily,
    patients,
    services,
    heatmap,
    inactivePatients,
    recurringPatients: current.pacientes_recurrentes ?? 0,
    horasAgendadas: current.horas_agendadas,
    horasAgendadasPrevias: previous.horas_agendadas,
  };
}
