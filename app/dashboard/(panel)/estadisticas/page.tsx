import "server-only";

import { cache } from "react";
import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { addDaysToKey, isValidDayKey, todayKey } from "@/lib/dates";
import type { PublicDoctor } from "@/lib/types";
import { fetchStatsSnapshot } from "@/lib/stats/queries";
import type { StatsRange } from "@/lib/stats/types";
import { EstadisticasView } from "./estadisticas-view";
import { PageHeader } from "@/components/dashboard/page-header";
import { ErrorNotice } from "@/components/ui";
import { DoctorPicker } from "../doctor-picker";
import { RangePicker } from "./range-picker";

export const dynamic = "force-dynamic";

type Rango = "semana" | "mes" | "trimestre";

interface PageProps {
  searchParams: Promise<{ range?: string; from?: string; to?: string; doctor?: string }>;
}

const cacheRango = cache(async (): Promise<PublicDoctor[]> => {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("doctors")
    .select("id, full_name")
    .eq("role", "professional")
    .eq("active", true)
    .order("full_name");
  return (data ?? []) as unknown as PublicDoctor[];
});

function rangoSe(rango: Rango): StatsRange {
  const hoy = todayKey();
  switch (rango) {
    case "semana":
      return { from: addDaysToKey(hoy, -6), to: hoy };
    case "trimestre":
      return { from: addDaysToKey(hoy, -89), to: hoy };
    case "mes":
      return { from: addDaysToKey(hoy, -29), to: hoy };
  }
}

const etiquetas: Record<Rango, string> = {
  semana: "Últimos 7 días",
  mes: "Últimos 30 días",
  trimestre: "Últimos 90 días",
};

function rangoPrevio(r: StatsRange): StatsRange {
  const fecha1 = new Date(`${r.from}T12:00:00Z`).getTime();
  const fecha2 = new Date(`${r.to}T12:00:00Z`).getTime();
  const largo = Math.round(Math.abs(fecha2 - fecha1) / (24 * 60 * 60 * 1000)) + 1;
  const prevTo = addDaysToKey(r.from, -1);
  return { from: addDaysToKey(prevTo, -(largo - 1)), to: prevTo };
}

export default async function EstadisticasPage({ searchParams }: PageProps) {
  const session = await getDoctorSession();
  if (!session) return null;

  const { range, from, to, doctor } = await searchParams;
  const rango: Rango = range === "semana" || range === "trimestre" ? range : "mes";

  const veTodoElEquipo = session.isAdmin || session.role === "reception";
  const esRecepcion = session.role === "reception" && !session.isAdmin;
  const filtroPorDefecto = esRecepcion ? null : session.id;
  const doctorId = veTodoElEquipo
    ? doctor === "all"
      ? null
      : doctor && doctor !== "all"
        ? doctor
        : filtroPorDefecto
    : session.id;

  const personalizado = isValidDayKey(from) && isValidDayKey(to) && from <= to;
  const periodo: StatsRange = personalizado ? { from: from!, to: to! } : rangoSe(rango);
  const previo = rangoPrevio(periodo);

  const teamPromise = veTodoElEquipo ? cacheRango() : Promise.resolve([]);

  const [team, result] = await Promise.all([
    teamPromise,
    fetchStatsSnapshot({
      range: periodo,
      previousRange: previo,
      doctorId,
    }).then(
      (s) => ({ ok: true as const, snapshot: s }),
      (err: unknown) => ({ ok: false as const, error: err instanceof Error ? err.message : String(err) }),
    ),
  ]);

  const error = result.ok ? null : result.error;
  const snapshot = result.ok ? result.snapshot : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estadísticas"
        title="Estadísticas"
        description="Citas, ocupación, asistencia, cancelaciones y servicios agregados. Sin datos clínicos ni nombres de pacientes."
        meta={
          snapshot ? (
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs font-medium text-neutral-600 tabular-nums">
              {periodo.from} → {periodo.to}
            </span>
          ) : null
        }
      />

      {veTodoElEquipo ? (
        <div className="flex flex-wrap items-end gap-3">
          <RangePicker range={personalizado ? null : rango} />
          <DoctorPicker
            current={doctorId}
            canFilter={veTodoElEquipo}
            doctors={team}
            basePath="/dashboard/estadisticas"
          />
        </div>
      ) : (
        <RangePicker range={personalizado ? null : rango} />
      )}

      {error ? <ErrorNotice message={error} /> : null}

      {snapshot ? (
        <EstadisticasView
          snapshot={snapshot}
          periodoLabel={personalizado ? "Periodo personalizado" : etiquetas[rango]}
          periodoPrevioLabel={
            previo.from === previo.to ? `${previo.from}` : `${previo.from} → ${previo.to}`
          }
        />
      ) : null}
    </div>
  );
}
