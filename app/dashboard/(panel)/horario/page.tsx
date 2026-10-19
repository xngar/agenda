import "server-only";

import { requireDoctor } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { PublicDoctor } from "@/lib/types";
import { DoctorPicker } from "../doctor-picker";
import { ScheduleEditor, type AvailabilityRule } from "./schedule-editor";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ doctor?: string }>;
}

/**
 * Horario de atención semanal.
 *
 * La regla de permisos vive en RLS (`doctor_id = auth.uid() OR is_admin()
 * OR recepción de la organización`): un profesional edita lo suyo, un admin
 * o la recepción el de cualquier profesional. Esta página sólo decide a
 * quién se le pide la información; si alguien manipula `?doctor=`, la
 * consulta devuelve vacío y el formulario no tiene nada que guardar.
 *
 * El horario no está ligado a las citas existentes: cambiarlo decide qué
 * horas se ofrecen a partir de ahora y no reagenda lo ya reservado. Por eso
 * el formulario avisa antes de aplicar el cambio.
 */
export default async function HorarioPage({ searchParams }: PageProps) {
  const session = await requireDoctor();
  const { doctor: doctorParam } = await searchParams;

  const puedeGestionar = session.isAdmin || session.role === "reception";

  const supabase = await supabaseServer();
  const team = puedeGestionar ? await getTeam() : [];

  // Recepción sin ?doctor=: primer profesional activo. Profesional común: lo suyo.
  const doctorId =
    puedeGestionar && doctorParam && doctorParam !== "all"
      ? doctorParam
      : puedeGestionar
        ? (team[0]?.id ?? session.id)
        : session.id;

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

  const seleccionado = team.find((d) => d.id === doctorId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Disponibilidad"
        title="Horario de atención"
        description={
          <>
            Los días y horas que el asistente público ofrece para{" "}
            <span className="font-medium text-neutral-800">
              {seleccionado?.full_name ?? session.full_name}
            </span>
            .
          </>
        }
        actions={
          puedeGestionar ? (
            <DoctorPicker
              current={doctorId}
              canFilter
              doctors={team}
              basePath="/dashboard/horario"
              allOption={false}
            />
          ) : undefined
        }
      />

      <ScheduleEditor
        key={doctorId}
        doctorId={doctorId}
        isAdmin={puedeGestionar}
        initial={inicial}
      />

      <BackLink />
    </div>
  );
}

/** Profesionales activos, para poder cambiar de profesional desde esta página. */
async function getTeam(): Promise<PublicDoctor[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("doctors")
    .select("id, full_name")
    .eq("role", "professional")
    .eq("active", true)
    .order("full_name");
  return (data ?? []) as unknown as PublicDoctor[];
}