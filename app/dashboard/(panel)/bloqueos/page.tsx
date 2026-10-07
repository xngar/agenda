import "server-only";

import Link from "next/link";
import { getOrgSettings, requireDoctor } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { dateKey, timeKey } from "@/lib/dates";
import { parseAppointmentRange } from "@/lib/range";
import type { PublicDoctor } from "@/lib/types";
import { DoctorPicker } from "../doctor-picker";
import { TimeOffEditor, type BlockedRange } from "./time-off-editor";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ doctor?: string }>;
}

/**
 * Bloqueos de tiempo (vacaciones, colación o un rato sin atención).
 *
 * Un bloqueo deja de ofrecer esas horas en el asistente público pero NO
 * mueve ni cancela las citas ya agendadas: el formulario avisa cuáles
 * quedarían dentro y pide confirmación. Igual que en el horario.
 *
 * La autorización es RLS de `time_off` (`doctor_id = auth.uid() OR
 * is_admin()`); el `?doctor=` sólo decide a quién se le pide la lista.
 */
export default async function BloqueosPage({ searchParams }: PageProps) {
  const session = await requireDoctor();
  const { doctor: doctorParam } = await searchParams;

  const soloAdmin = session.isAdmin && doctorParam && doctorParam !== "all";
  const doctorId = soloAdmin ? doctorParam : session.id;

  const settings = await getOrgSettings(session.orgId);
  const supabase = await supabaseServer();

  const { data: bloques } = await supabase
    .from("time_off")
    .select("id, during, reason")
    .eq("doctor_id", doctorId)
    .order("during");

  const list: BlockedRange[] = (bloques ?? []).map((row) => {
    const { start, end } = parseAppointmentRange(row.during as unknown as string);
    const diaInicio = dateKey(start, settings.timezone);
    const diaFin = dateKey(end, settings.timezone);
    return {
      id: row.id as string,
      dia: diaInicio,
      desde: timeKey(start, settings.timezone),
      hasta: timeKey(end, settings.timezone),
      cruzaMedianoche: diaFin !== diaInicio,
      motivos: row.reason as string | null,
    };
  });

  const team = session.isAdmin ? await getTeam() : [];
  const seleccionado = team.find((d) => d.id === doctorId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Bloqueos de tiempo</h1>
          <p className="text-sm text-neutral-600">
            Rangos en los que{" "}
            <span className="font-medium text-neutral-800">
              {seleccionado?.full_name ?? session.full_name}
            </span>{" "}
            no atiende: el asistente deja de ofrecer esas horas.
          </p>
        </div>

        {session.isAdmin ? (
          <DoctorPicker
            current={doctorId}
            canFilter
            doctors={team}
            basePath="/dashboard/bloqueos"
            allOption={false}
          />
        ) : null}
      </div>

      <TimeOffEditor
        key={doctorId}
        doctorId={doctorId}
        initial={list}
        timezone={settings.timezone}
      />

      <p className="text-sm text-neutral-500">
        <Link className="underline underline-offset-4 hover:text-brand-navy" href="/dashboard">
          Volver a la agenda
        </Link>
      </p>
    </div>
  );
}

/** Equipo, para poder cambiar de profesional desde esta página. */
async function getTeam(): Promise<PublicDoctor[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("doctors").select("id, full_name").order("full_name");
  return (data ?? []) as unknown as PublicDoctor[];
}