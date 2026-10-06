import "server-only";

import Link from "next/link";
import { requireDoctor } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { PublicDoctor } from "@/lib/types";
import { DoctorPicker } from "../doctor-picker";
import { ScheduleEditor, type AvailabilityRule } from "./schedule-editor";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ doctor?: string }>;
}

/**
 * Horario de atención semanal.
 *
 * La regla de permisos vive en RLS (`doctor_id = auth.uid() OR is_admin()`):
 * un profesional edita lo suyo, un admin el de cualquiera. Esta página sólo
 * decide a quién se le pide la información; si alguien manipula `?doctor=`,
 * la consulta devuelve vacío y el formulario no tiene nada que guardar.
 *
 * El horario no está ligado a las citas existentes: cambiarlo decide qué
 * horas se ofrecen a partir de ahora y no reagenda lo ya reservado. Por eso
 * el formulario avisa antes de aplicar el cambio.
 */
export default async function HorarioPage({ searchParams }: PageProps) {
  const session = await requireDoctor();
  const { doctor: doctorParam } = await searchParams;

  const soloAdmin = session.isAdmin && doctorParam && doctorParam !== "all";
  const doctorId = soloAdmin ? doctorParam : session.id;

  const supabase = await supabaseServer();

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("id, weekday, start_time, end_time")
    .eq("doctor_id", doctorId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  // La base guarda `start_time`/`end_time` como `time`; el formulario y la API
  // hablan de `startTime`/`endTime` en `HH:MM`. Sin este puente los inputs de
  // hora llegan `undefined` y el render revienta.
  const inicial: AvailabilityRule[] = (rules ?? []).map((r) => ({
    id: r.id as string,
    weekday: r.weekday as number,
    startTime: String(r.start_time).slice(0, 5),
    endTime: String(r.end_time).slice(0, 5),
  }));

  const team = session.isAdmin ? await getTeam() : [];
  const seleccionado = team.find((d) => d.id === doctorId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Horario de atención</h1>
          <p className="text-sm text-neutral-600">
            Los días y horas que el asistente público ofrece para{" "}
            <span className="font-medium text-neutral-800">
              {seleccionado?.full_name ?? session.full_name}
            </span>
            .
          </p>
        </div>

        {session.isAdmin ? (
          <DoctorPicker
            current={doctorId}
            isAdmin
            doctors={team}
            basePath="/dashboard/horario"
            allOption={false}
          />
        ) : null}
      </div>

      <ScheduleEditor
        key={doctorId}
        doctorId={doctorId}
        isAdmin={session.isAdmin}
        initial={inicial}
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
  const { data } = await supabase
    .from("doctors")
    .select("id, full_name")
    .order("full_name");
  return (data ?? []) as unknown as PublicDoctor[];
}