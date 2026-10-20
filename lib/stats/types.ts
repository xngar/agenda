export interface StatsRange {
  from: string;
  to: string;
}

export interface StatsKpisRaw {
  citas: number | null;
  horas_agendadas: number | null;
  ocupacion: number | null;
  inasistencia: number | null;
  canceladas_paciente: number | null;
  canceladas_profesional: number | null;
  canceladas_tardias: number | null;
  pacientes_nuevos: number | null;
  pacientes_recurrentes: number | null;
  ingreso_perdido: number | null;
  precios_configurados: boolean | null;
}

export interface StatsDailyRow {
  day: string;
  total: number;
  completadas: number;
  no_shows: number;
  canceladas: number;
  pendientes: number;
}

export interface StatsPatientsRow {
  mes: string;
  nuevos: number;
  recurrentes: number;
}

export interface StatsServicesRow {
  service_name: string;
  total: number;
  precio: number | null;
  ingreso: number;
}

export interface StatsHeatmapRow {
  dow: number;
  hora: number;
  total: number;
}

export type StatsKpiUnit = "count" | "pct" | "hours" | "currency";

export interface StatsKpi {
  key: string;
  label: string;
  hint?: string;
  current: number | null;
  previous: number | null;
  /** Comparación vs. el periodo anterior: % o puntos porcentuales. */
  deltaPct: number | null;
  /** Para porcentajes: se muestra "puntos" en vez de %. */
  deltaPoints: number | null;
  unit: StatsKpiUnit;
  /** Cuando subir la métrica es mala noticia (inasistencia, cancelaciones). */
  goodDown?: boolean;
}

export interface StatsSnapshot {
  range: StatsRange;
  previousRange: StatsRange;
  doctorId: string | null;
  kpis: StatsKpi[];
  daily: StatsDailyRow[];
  patients: StatsPatientsRow[];
  services: StatsServicesRow[];
  heatmap: StatsHeatmapRow[];
  inactivePatients: number;
  recurringPatients: number;
  horasAgendadas: number | null;
  horasAgendadasPrevias: number | null;
}
