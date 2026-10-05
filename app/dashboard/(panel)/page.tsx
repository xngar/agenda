import "server-only";

import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { isValidDayKey, todayKey } from "@/lib/dates";
import type { DoctorAppointment, PublicDoctor } from "@/lib/types";
import { Agenda } from "./agenda";
import { DayNav } from "./day-nav";
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

  /**
   * Días con citas en las próximas dos semanas.
   *
   * Sin esto, un día sin citas se veía como una lista vacía sin explicación:
   * el panel abre en hoy, así que una cita reservada para mañana era
   * invisible y parecía que la reserva se había perdido.
   */
  const { data: resumen } = await supabase.rpc("dashboard_day_summaries", {
    p_from: dayKey,
    p_to: addDaysKey(dayKey, 14),
    p_doctor: onlyDoctorId,
  });
  const diasConCitas = ((resumen ?? []) as unknown as {
    day: string;
    total: number;
    pendientes: number;
  }[]).map((r) => ({ ...r, day: r.day.slice(0, 10) }));

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
            <time dateTime={dayKey}>{dayLabel(dayKey)}</time>
            {" · "}
            {appointments.length} cita{appointments.length === 1 ? "" : "s"}
            {appointments.length > 0 ? " este día" : ""}
          </p>
        </div>

        {session.isAdmin ? (
          <DoctorPicker current={onlyDoctorId} isAdmin={session.isAdmin} doctors={team} />
        ) : null}
      </div>

      <DayNav dayKey={dayKey} today={todayKey()} resumen={diasConCitas} />

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
        diasConCitas={diasConCitas}
      />

      <p className="text-sm text-neutral-500">
        <Link className="underline underline-offset-4 hover:text-brand-navy" href="/">
          Ir al sitio público
        </Link>
      </p>
    </div>
  );
}

/** Etiqueta legible del día local, sin desfase por zona horaria. */
function dayLabel(dayKey: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${dayKey}T12:00:00Z`));
}

/** Suma días a una clave "yyyy-MM-dd" sin pasar por la zona local. */
function addDaysKey(dayKey: string, delta: number): string {
  const [a, m, d] = dayKey.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  f.setUTCDate(f.getUTCDate() + delta);
  return f.toISOString().slice(0, 10);
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