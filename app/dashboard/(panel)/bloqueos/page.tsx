import "server-only";

import { getOrgSettings, requireDoctor } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { dateKey, timeKey } from "@/lib/dates";
import { parseAppointmentRange } from "@/lib/range";
import type { PublicDoctor } from "@/lib/types";
import { DoctorPicker } from "../doctor-picker";
import { TimeOffEditor, type BlockedRange } from "./time-off-editor";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";
import { EmptyState } from "@/components/ui";

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
 * is_admin() OR recepción de la organización`); el `?doctor=` sólo decide
 * a quién se le pide la lista.
 */
export default async function BloqueosPage({ searchParams }: PageProps) {
  const session = await requireDoctor();
  const { doctor: doctorParam } = await searchParams;

  const puedeGestionar = session.isAdmin || session.role === "reception";
  const esRecepcion = !session.isAdmin && session.role === "reception";

  const settings = await getOrgSettings(session.orgId);
  const supabase = await supabaseServer();
  const team = puedeGestionar ? await getTeam() : [];

  // Admin/profesional: lo propio por defecto (`?doctor=<id>` muestra a otro).
  // La recepción no tiene bloqueos propios: debe elegir un profesional.
  const doctorId =
    puedeGestionar && doctorParam && doctorParam !== "all"
      ? doctorParam
      : esRecepcion
        ? null
        : session.id;

  const bloquesRes = doctorId
    ? await supabase
        .from("time_off")
        .select("id, during, reason")
        .eq("doctor_id", doctorId)
        .order("during")
    : { data: [] };

  const list: BlockedRange[] = ((bloquesRes.data ?? []) as {
    id: string;
    during: string;
    reason: string | null;
  }[]).map((row) => {
    const { start, end } = parseAppointmentRange(row.during);
    const diaInicio = dateKey(start, settings.timezone);
    const diaFin = dateKey(end, settings.timezone);
    return {
      id: row.id,
      dia: diaInicio,
      desde: timeKey(start, settings.timezone),
      hasta: timeKey(end, settings.timezone),
      cruzaMedianoche: diaFin !== diaInicio,
      motivos: row.reason,
    };
  });

  const seleccionado = team.find((d) => d.id === doctorId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Disponibilidad"
        title="Bloqueos de tiempo"
        description={
          <>
            Rangos en los que{" "}
            <span className="font-medium text-neutral-800">
              {seleccionado?.full_name ?? (doctorId ? session.full_name : "el profesional que elijas")}
            </span>{" "}
            no atiende: el asistente deja de ofrecer esas horas.
          </>
        }
        actions={
          puedeGestionar ? (
            <DoctorPicker
              current={doctorId}
              canFilter
              doctors={team}
              basePath="/dashboard/bloqueos"
              allOption={false}
            />
          ) : undefined
        }
      />

      {doctorId ? (
        <TimeOffEditor
          key={doctorId}
          doctorId={doctorId}
          initial={list}
          timezone={settings.timezone}
        />
      ) : (
        <EmptyState
          title="Elige un profesional"
          description="Selecciona de quién quieres ver los bloqueos usando el selector superior."
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