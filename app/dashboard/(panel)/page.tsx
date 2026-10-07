import "server-only";

import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import {
  addDaysToKey,
  isValidDayKey,
  isValidMonthKey,
  monthGridRange,
  monthLabel,
  todayKey,
} from "@/lib/dates";
import type { DoctorAppointment, PublicDoctor } from "@/lib/types";
import { Agenda } from "./agenda";
import { DayNav } from "./day-nav";
import { DoctorPicker } from "./doctor-picker";
import { MonthView } from "./month-view";
import { ViewToggle } from "./view-toggle";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ date?: string; doctor?: string; view?: string; month?: string }>;
}

/**
 * Agenda del panel.
 *
 * Dos vistas sobre la misma agenda: día (`?date=`) y mes
 * (`?view=mes&month=`). Un admin puede ver la de todo el equipo con
 * `?doctor=<id>`; cada profesional ve siempre la suya. La consulta pasa
 * por el cliente de sesión (anon + RLS), no por el service role: así la
 * vista no depende de que el filtro esté bien escrito en el código.
 */
export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getDoctorSession();
  if (!session) return null; // el layout ya redirige

  const { date, doctor, view, month } = await searchParams;
  const dayKey = isValidDayKey(date) ? date : todayKey();
  const onlyDoctorId = session.isAdmin && doctor && doctor !== "all" ? doctor : null;
  const verMes = view === "mes";
  const mesKey = isValidMonthKey(month) ? month : dayKey.slice(0, 7);
  const grid = monthGridRange(mesKey);

  const supabase = await supabaseServer();

  let appointments: DoctorAppointment[] = [];
  let diasConCitas: { day: string; total: number; pendientes: number }[] = [];
  let unreadCount = 0;
  let error: string | null = null;

  if (verMes) {
    /**
     * El rango de la grilla incluye los días de los meses vecinos (las
     * semanas se muestran completas), así que se piden junto con sus
     * citas: una cita del 1 de noviembre se ve en la última fila de
     * octubre. Misma razón que la agenda del día: `during` es un
     * tstzrange y el filtro es de solapamiento (&&) dentro de la función.
     */
    const { data, error: rpcError } = await supabase.rpc("dashboard_month_appointments", {
      p_from: grid.from,
      p_to: grid.to,
      p_doctor: onlyDoctorId,
    });
    appointments = (data ?? []) as unknown as DoctorAppointment[];
    error = rpcError?.message ?? null;
  } else {
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
    const { data, error: rpcError } = await supabase.rpc("dashboard_appointments", {
      p_day: dayKey,
      p_doctor: onlyDoctorId,
    });
    appointments = (data ?? []) as unknown as DoctorAppointment[];
    error = rpcError?.message ?? null;

    /**
     * Días con citas en las próximas dos semanas.
     *
     * Sin esto, un día sin citas se veía como una lista vacía sin explicación:
     * el panel abre en hoy, así que una cita reservada para mañana era
     * invisible y parecía que la reserva se había perdido.
     */
    const { data: resumen } = await supabase.rpc("dashboard_day_summaries", {
      p_from: dayKey,
      p_to: addDaysToKey(dayKey, 14),
      p_doctor: onlyDoctorId,
    });
    diasConCitas = ((resumen ?? []) as unknown as {
      day: string;
      total: number;
      pendientes: number;
    }[]).map((r) => ({ ...r, day: r.day.slice(0, 10) }));

    const { data: unread } = await supabase
      .from("notifications")
      .select("id")
      .eq("doctor_id", session.id)
      .is("read_at", null);
    unreadCount = (unread ?? []).length;
  }

  // El equipo sólo se carga para admins, que son los únicos que pueden
  // cambiar el filtro.
  const team = session.isAdmin ? await getActiveDoctors() : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">
            {verMes ? "Calendario" : "Agenda"}
          </h1>
          <p className="text-sm text-neutral-600">
            {verMes ? (
              <>
                <time dateTime={mesKey}>{monthLabel(mesKey)}</time>
                {" · "}
                {appointments.length} cita{appointments.length === 1 ? "" : "s"}
                {appointments.length > 0 ? " este mes" : ""}
              </>
            ) : (
              <>
                <time dateTime={dayKey}>{dayLabel(dayKey)}</time>
                {" · "}
                {appointments.length} cita{appointments.length === 1 ? "" : "s"}
                {appointments.length > 0 ? " este día" : ""}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle verMes={verMes} dayKey={dayKey} mesKey={mesKey} doctor={onlyDoctorId} />
          {session.isAdmin ? (
            <DoctorPicker current={onlyDoctorId} isAdmin={session.isAdmin} doctors={team} />
          ) : null}
        </div>
      </div>

      {!verMes ? <DayNav dayKey={dayKey} today={todayKey()} resumen={diasConCitas} /> : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          No pudimos cargar la agenda: {error}
        </p>
      ) : null}

      {verMes ? (
        <MonthView
          key={mesKey}
          initial={appointments}
          mesKey={mesKey}
          gridFrom={grid.from}
          gridTo={grid.to}
          hoy={todayKey()}
          currentUserId={session.id}
          isAdmin={session.isAdmin}
          realtimeDoctorId={onlyDoctorId ?? session.id}
          doctorFilter={onlyDoctorId}
        />
      ) : (
        <Agenda
          initial={appointments}
          dayKey={dayKey}
          doctorId={onlyDoctorId ?? session.id}
          canSeeAll={session.isAdmin}
          unreadCount={unreadCount}
          diasConCitas={diasConCitas}
        />
      )}

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
