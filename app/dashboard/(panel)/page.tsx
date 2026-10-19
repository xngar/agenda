import "server-only";

import { cache } from "react";
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
import { ErrorNotice } from "@/components/ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { AnimatedNumber } from "@/components/motion/animated-number";

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
  const supabase = await supabaseServer();

  // Ejecutamos todas las consultas independientes en paralelo para evitar la cascada (waterfall) de red
  const appointmentsPromise = verMes
    ? supabase.rpc("dashboard_month_appointments", {
        p_from: grid!.from,
        p_to: grid!.to,
        p_doctor: onlyDoctorId,
      })
    : vista === "semana"
      ? supabase.rpc("dashboard_month_appointments", {
          p_from: week.from,
          p_to: week.to,
          p_doctor: onlyDoctorId,
        })
      : supabase.rpc("dashboard_appointments", {
          p_day: dayKey,
          p_doctor: onlyDoctorId,
        });

  const resumenPromise = verMes
    ? Promise.resolve({ data: [] as unknown[] })
    : vista === "semana"
      ? supabase.rpc("dashboard_day_summaries", {
          p_from: week.from,
          p_to: week.to,
          p_doctor: onlyDoctorId,
        })
      : supabase.rpc("dashboard_day_summaries", {
          p_from: dayKey,
          p_to: addDaysToKey(dayKey, 14),
          p_doctor: onlyDoctorId,
        });

  const unreadPromise = verMes
    ? Promise.resolve({ data: [] as unknown[] })
    : supabase
        .from("notifications")
        .select("id")
        .eq("doctor_id", session.id)
        .is("read_at", null);

  const teamPromise = veTodoElEquipo ? getActiveDoctors() : Promise.resolve([]);

  const servicesPromise = supabase
    .from("services")
    .select("id, name, duration_min")
    .eq("org_id", session.orgId)
    .eq("active", true)
    .order("name");

  const meDoctorPromise = !veTodoElEquipo
    ? supabase
        .from("doctors")
        .select("id, full_name")
        .eq("id", session.id)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const [
    orgSettings,
    appointmentsRes,
    resumenRes,
    unreadRes,
    team,
    serviceRowsRes,
    meDoctorRes,
  ] = await Promise.all([
    getOrgSettings(session.orgId),
    appointmentsPromise,
    resumenPromise,
    unreadPromise,
    teamPromise,
    servicesPromise,
    meDoctorPromise,
  ]);

  const tzClinica = orgSettings.timezone;
  const appointments = (appointmentsRes.data ?? []) as unknown as DoctorAppointment[];
  const error = appointmentsRes.error?.message ?? null;

  const diasConCitas = ((resumenRes.data ?? []) as unknown as {
    day: string;
    total: number;
    pendientes: number;
  }[]).map((r) => ({ ...r, day: r.day.slice(0, 10) }));

  const unreadCount = (unreadRes.data ?? []).length;
  const bookingServices = (serviceRowsRes.data ?? []) as StaffService[];

  let bookingDoctors: StaffDoctor[] = team.map((d) => ({ id: d.id, full_name: d.full_name }));
  if (!veTodoElEquipo && meDoctorRes.data) {
    const me = meDoctorRes.data as { id: string; full_name: string };
    bookingDoctors = [{ id: me.id, full_name: me.full_name }];
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
    <div className="space-y-6">
      <PageHeader
        eyebrow={verMes ? "Calendario" : "Agenda"}
        title={
          verMes ? (
            <time dateTime={mesKey}>{monthLabel(mesKey)}</time>
          ) : vista === "semana" ? (
            <time dateTime={week.from}>{weekLabel(week.from, week.to)}</time>
          ) : (
            <time dateTime={dayKey}>{dayLabel(dayKey)}</time>
          )
        }
        meta={
          <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs font-medium tabular-nums text-neutral-600">
            <AnimatedNumber value={totalCitas} /> cita{totalCitas === 1 ? "" : "s"}
            {totalCitas > 0 ? ` ${ventana}` : ""}
          </span>
        }
        actions={
          <>
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
              <DoctorPicker
                current={onlyDoctorId}
                canFilter={veTodoElEquipo}
                doctors={team}
                mostrarEtiqueta={false}
              />
            ) : null}
          </>
        }
      />

      {verMes ? null : vista === "semana" ? (
        <WeekNav dayKey={dayKey} today={todayKey()} />
      ) : (
        <DayNav dayKey={dayKey} today={todayKey()} resumen={diasConCitas} />
      )}

      {error ? <ErrorNotice message={`No pudimos cargar la agenda: ${error}`} /> : null}

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
          orgName={orgSettings.name}
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
          orgName={orgSettings.name}
        />
      ) : (
        <Agenda
          initial={appointments}
          dayKey={dayKey}
          doctorId={onlyDoctorId ?? session.id}
          unreadCount={unreadCount}
          diasConCitas={diasConCitas}
          doctors={bookingDoctors}
          orgName={orgSettings.name}
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

const getActiveDoctors = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("doctors")
    .select("id, full_name")
    .eq("role", "professional")
    .eq("active", true)
    .order("full_name");

  return (data ?? []) as unknown as PublicDoctor[];
});
