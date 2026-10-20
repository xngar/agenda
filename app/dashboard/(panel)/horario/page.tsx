import "server-only";

import { requireDoctor } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { PublicDoctor } from "@/lib/types";
import { DoctorPicker } from "../doctor-picker";
import { ScheduleEditor, type AvailabilityRule } from "./schedule-editor";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";
import { EmptyState } from "@/components/ui";

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
  const esRecepcion = !session.isAdmin && session.role === "reception";

  const supabase = await supabaseServer();
  const team = puedeGestionar ? await getTeam() : [];

  // Admin/profesional: lo propio por defecto (`?doctor=<id>` muestra a otro).
  // La recepción no tiene horario propio: debe elegir un profesional.
  const doctorId =
    puedeGestionar && doctorParam && doctorParam !== "all"
      ? doctorParam
      : esRecepcion
        ? null
        : session.id;

  const rulesRes = doctorId
    ? await supabase
        .from("availability_rules")
        .select("id, weekday, start_time, end_time")
        .eq("doctor_id", doctorId)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true })
    : { data: [] };

  // La base guarda `start_time`/`end_time` como `time`; el formulario y la API
  // hablan de `startTime`/`endTime` en `HH:MM`. Sin este puente los inputs de
  // hora llegan `undefined` y el render revienta.
  const inicial: AvailabilityRule[] = ((rulesRes.data ?? []) as {
    id: string;
    weekday: number;
    start_time: string;
    end_time: string;
  }[]).map((r) => ({
    id: r.id,
    weekday: r.weekday,
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
              {seleccionado?.full_name ?? (doctorId ? session.full_name : "el profesional que elijas")}
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

      {doctorId ? (
        <ScheduleEditor
          key={doctorId}
          doctorId={doctorId}
          isAdmin={puedeGestionar}
          initial={inicial}
        />
      ) : (
        <EmptyState
          title="Elige un profesional"
          description="Selecciona a quién editar usando el selector superior para ver y modificar su horario."
        />
      )}

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