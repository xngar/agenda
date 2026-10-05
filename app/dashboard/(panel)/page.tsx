import "server-only";

import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { isValidDayKey, todayKey } from "@/lib/dates";
import type { DoctorAppointment, PublicDoctor } from "@/lib/types";
import { Agenda } from "./agenda";
import { DoctorPicker } from "./doctor-picker";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ date?: string; doctor?: string }>;
}

/**
 * Agenda del panel.
 *
 * Un admin puede ver la de todo el equipo con `?doctor=<id>`; cada
 * profesional ve siempre la suya. La consulta pasa por el cliente de
 * sesión (anon + RLS), no por el service role: así la vista no depende
 * de que el filtro esté bien escrito en el código.
 */
export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getDoctorSession();
  if (!session) return null; // el layout ya redirige

  const { date, doctor } = await searchParams;
  const dayKey = isValidDayKey(date) ? date : todayKey();
  const onlyDoctorId = session.isAdmin && doctor && doctor !== "all" ? doctor : null;

  const supabase = await supabaseServer();

  /**
   * La agenda se pide con `dashboard_appointments`, no con un
   * `.gte("during", …)`: `during` es un `tstzrange` y filtrar un rango con
   * >= / <= falla con "malformed range literal". La función usa el
   * solapamiento (&&) y calcula el día con `at time zone`, que ya resuelve
   * el cambio de hora de verano.
   *
   * Pasa por `security invoker`, así que RLS sigue aplicando: un
   * profesional ve sólo lo suyo y un admin, todo el equipo.
   */
  const { data, error } = await supabase.rpc("dashboard_appointments", {
    p_day: dayKey,
    p_doctor: onlyDoctorId,
  });

  const appointments = (data ?? []) as unknown as DoctorAppointment[];

  const { data: unread } = await supabase
    .from("notifications")
    .select("id")
    .eq("doctor_id", session.id)
    .is("read_at", null);

  // El equipo sólo se carga para admins, que son los únicos que pueden
  // cambiar el filtro.
  const team = session.isAdmin ? await getActiveDoctors() : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Agenda</h1>
          <p className="text-sm text-neutral-600">
            {new Intl.DateTimeFormat("es-CL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            }).format(new Date(`${dayKey}T12:00:00Z`))}
            {" · "}
            {appointments.length} cita{appointments.length === 1 ? "" : "s"}
          </p>
        </div>

        {session.isAdmin ? (
          <DoctorPicker current={onlyDoctorId} isAdmin={session.isAdmin} doctors={team} />
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          No pudimos cargar la agenda: {error.message}
        </p>
      ) : null}

      <Agenda
        initial={appointments}
        dayKey={dayKey}
        doctorId={onlyDoctorId ?? session.id}
        canSeeAll={session.isAdmin}
        unreadCount={(unread ?? []).length}
      />

      <p className="text-sm text-neutral-500">
        <Link className="underline underline-offset-4 hover:text-brand-navy" href="/">
          Ir al sitio público
        </Link>
      </p>
    </div>
  );
}

/** Equipo activo, para el filtro del admin. */
async function getActiveDoctors() {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("doctors")
    .select("id, full_name")
    .eq("active", true)
    .order("full_name");

  return (data ?? []) as unknown as PublicDoctor[];
}