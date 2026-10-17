import "server-only";

import { getDoctorSession, getOrgSettings } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import {
  addDaysToKey,
  dateKey,
  isValidDayKey,
  isValidMonthKey,
  monthGridRange,
  monthLabel,
  todayKey,
  weekLabel,
  weekRange,
} from "@/lib/dates";
import { parseAppointmentRange } from "@/lib/range";
import type { DoctorAppointment, PublicDoctor } from "@/lib/types";
import { Agenda } from "./agenda";
import { DayNav } from "./day-nav";
import { DoctorPicker } from "./doctor-picker";
import { MonthView } from "./month-view";
import { ViewToggle, type VistaAgenda } from "./view-toggle";
import { WeekNav } from "./week-nav";
import { WeekView } from "./week-view";
import {
  StaffBookingButton,
  type StaffDoctor,
  type StaffService,
} from "./staff-booking-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ date?: string; doctor?: string; view?: string; month?: string }>;
}

/**
 * Agenda del panel.
 *
 * Tres vistas sobre la misma agenda: día (`?date=`), semana
 * (`?view=semana&date=<lunes>`) y mes (`?view=mes&month=`). El admin y la
 * recepción pueden ver la de todo el equipo con `?doctor=<id>`; cada
 * profesional ve siempre la suya. La consulta pasa por el cliente de sesión
 * (anon + RLS), no por el service role: así la vista no depende de que el
 * filtro esté bien escrito en el código.
 */
export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getDoctorSession();
  if (!session) return null; // el layout ya redirige

  const { date, doctor, view, month } = await searchParams;
  const dayKey = isValidDayKey(date) ? date : todayKey();
  /**
   * Admin y recepción ven la agenda de todo el equipo: filtran por
   * profesional, cargan el selector y gestionan cualquier cita de la
   * organización (la recepción cubre al profesional que no está).
   */
  const veTodoElEquipo = session.isAdmin || session.role === "reception";
  const onlyDoctorId = veTodoElEquipo && doctor && doctor !== "all" ? doctor : null;
  const vista: VistaAgenda = view === "mes" ? "mes" : view === "semana" ? "semana" : "dia";
  const verMes = vista === "mes";
  const mesKey = isValidMonthKey(month) ? month : dayKey.slice(0, 7);
  // Sólo la vista mes necesita la grilla; el resto no la calculaba para nada.
  const grid = verMes ? monthGridRange(mesKey) : null;
  const week = weekRange(dayKey);

  /**
   * Zona de la clínica. Los días de la agenda se calculan en ella, no en la
   * del servidor ni en la del navegador: `organizations.timezone` puede ser
   * distinta a America/Santiago y el desfase mueve citas al día equivocado.
   */
  const { timezone: tzClinica } = await getOrgSettings(session.orgId);

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
      p_from: grid!.from,
      p_to: grid!.to,
      p_doctor: onlyDoctorId,
    });
    appointments = (data ?? []) as unknown as DoctorAppointment[];
    error = rpcError?.message ?? null;
  } else if (vista === "semana") {
    /*
     * La semana usa el mismo RPC que el mes con un rango de 7 días: lunes a
     * domingo, que es la semana calendario que ya usa la grilla mensual.
     */
    const { data, error: rpcError } = await supabase.rpc("dashboard_month_appointments", {
      p_from: week.from,
      p_to: week.to,
      p_doctor: onlyDoctorId,
    });
    appointments = (data ?? []) as unknown as DoctorAppointment[];
    error = rpcError?.message ?? null;

    const { data: resumen } = await supabase.rpc("dashboard_day_summaries", {
      p_from: week.from,
      p_to: week.to,
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

  // El equipo sólo se carga para quienes pueden cambiar el filtro
  // (admin y recepción).
  const team = veTodoElEquipo ? await getActiveDoctors() : [];

  // Catálogo y profesionales para la reserva del equipo: todos los roles
  // autenticados pueden leerlos (RLS), pero cada rol sólo reserva donde
  // le corresponde (lo impone la API, no este listado).
  const { data: serviceRows } = await supabase
    .from("services")
    .select("id, name, duration_min")
    .eq("org_id", session.orgId)
    .eq("active", true)
    .order("name");
  const bookingServices = (serviceRows ?? []) as StaffService[];
  let bookingDoctors: StaffDoctor[] = team.map((d) => ({ id: d.id, full_name: d.full_name }));
  if (!veTodoElEquipo) {
    const { data: me } = await supabase
      .from("doctors")
      .select("id, full_name")
      .eq("id", session.id)
      .maybeSingle();
    bookingDoctors = me ? [{ id: me.id as string, full_name: me.full_name as string }] : [];
  }

  /*
   * El chip cuenta el rango que la vista realmente muestra. En el mes eso no
   * puede ser `appointments.length`: la consulta trae la grilla completa (35 o
   * 42 días, con semanas completas) y ese total incluía días de los meses
   * vecinos que no son parte del mes que se está mirando.
   */
  const totalCitas = verMes
    ? appointments.filter((cita) => {
        const { start } = parseAppointmentRange(cita.during);
        return start ? dateKey(start).slice(0, 7) === mesKey : false;
      }).length
    : appointments.length;
  const ventana = verMes ? "este mes" : vista === "semana" ? "esta semana" : "este día";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-navy-600">
            {verMes ? "Calendario" : "Agenda"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            {verMes ? (
              <time dateTime={mesKey}>{monthLabel(mesKey)}</time>
            ) : vista === "semana" ? (
              <time dateTime={week.from}>{weekLabel(week.from, week.to)}</time>
            ) : (
              <time dateTime={dayKey}>{dayLabel(dayKey)}</time>
            )}
          </h1>
          <p className="mt-1.5">
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs font-medium tabular-nums text-neutral-600">
              {totalCitas} cita{totalCitas === 1 ? "" : "s"}
              {totalCitas > 0 ? ` ${ventana}` : ""}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {bookingServices.length > 0 && bookingDoctors.length > 0 ? (
            <StaffBookingButton
              services={bookingServices}
              doctors={bookingDoctors}
              defaultDoctorId={onlyDoctorId ?? (veTodoElEquipo ? null : session.id)}
              defaultDate={dayKey}
            />
          ) : null}
          <ViewToggle
            vista={vista}
            dayKey={dayKey}
            weekFrom={week.from}
            mesKey={mesKey}
            doctor={onlyDoctorId}
          />
          {veTodoElEquipo ? (
            <DoctorPicker current={onlyDoctorId} canFilter={veTodoElEquipo} doctors={team} />
          ) : null}
        </div>
      </div>

      {verMes ? null : vista === "semana" ? (
        <WeekNav dayKey={dayKey} today={todayKey()} />
      ) : (
        <DayNav dayKey={dayKey} today={todayKey()} resumen={diasConCitas} />
      )}

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
          gridFrom={grid!.from}
          gridTo={grid!.to}
          hoy={todayKey(tzClinica)}
          timezone={tzClinica}
          currentUserId={session.id}
          canManage={veTodoElEquipo}
          realtimeDoctorId={onlyDoctorId ?? session.id}
          doctorFilter={onlyDoctorId}
        />
      ) : vista === "semana" ? (
        <WeekView
          key={week.from}
          initial={appointments}
          weekFrom={week.from}
          weekTo={week.to}
          hoy={todayKey(tzClinica)}
          timezone={tzClinica}
          doctorId={onlyDoctorId ?? session.id}
          doctors={bookingDoctors}
        />
      ) : (
        <Agenda
          initial={appointments}
          dayKey={dayKey}
          doctorId={onlyDoctorId ?? session.id}
          unreadCount={unreadCount}
          diasConCitas={diasConCitas}
          doctors={bookingDoctors}
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

/** Profesionales activos, para el filtro de agenda (sin recepción). */
async function getActiveDoctors() {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("doctors")
    .select("id, full_name")
    .eq("role", "professional")
    .eq("active", true)
    .order("full_name");

  return (data ?? []) as unknown as PublicDoctor[];
}
