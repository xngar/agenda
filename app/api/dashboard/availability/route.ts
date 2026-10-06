import { NextResponse } from "next/server";
import { getClinicSettings, getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import {
  availabilityOverlaps,
  availabilityOverlapMessage,
  availabilityRulesSchema,
} from "@/lib/validation";
import { dateKey, timeKey, weekdayOfKey } from "@/lib/dates";
import { parseAppointmentRange } from "@/lib/range";

/**
 * Horario semanal de atención (las reglas de `availability_rules`).
 *
 * El panel reemplaza el horario entero en una sola llamada a
 * `replace_availability_rules` (migración 0014), en una sola transacción.
 *
 * Antes no había nada: cambiar un horario exigía escribir SQL a mano.
 *
 * La autorización es doble y a propósito: RLS (`doctor_id = auth.uid() OR
 * is_admin()`) es la que realmente manda, y el chequeo de abajo existe para
 * poder devolver un 403 legible en lugar de un error de Postgres.
 */

/** Normaliza `09:00:00` (viene de la base) a `09:00` (lo que espera el formulario). */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

async function loadRules(doctorId: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("availability_rules")
    .select("id, weekday, start_time, end_time")
    .eq("doctor_id", doctorId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    weekday: r.weekday as number,
    startTime: String(r.start_time).slice(0, 5),
    endTime: String(r.end_time).slice(0, 5),
  }));
}

export async function GET(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const url = new URL(request.url);
  const doctorId = url.searchParams.get("doctorId") ?? session.id;

  if (doctorId !== session.id && !session.isAdmin) {
    return NextResponse.json(
      { error: "Sólo puedes ver tu propio horario" },
      { status: 403 },
    );
  }

  try {
    return NextResponse.json({ doctorId, rules: await loadRules(doctorId) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo leer el horario" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const body = availabilityRulesSchema.safeParse(raw);

  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Revisa el horario" },
      { status: 422 },
    );
  }

  const { doctorId, rules } = body.data;

  if (doctorId !== session.id && !session.isAdmin) {
    return NextResponse.json(
      { error: "Sólo puedes modificar tu propio horario" },
      { status: 403 },
    );
  }

  if (availabilityOverlaps(rules)) {
    return NextResponse.json({ error: availabilityOverlapMessage }, { status: 422 });
  }

  /*
   * Cambiar el horario no mueve ni cancela citas ya agendadas: sólo decide
   * qué horas ofrece a partir de ahora. Antes de aplicarlo se listan las
   * citas que quedarían fuera del nuevo horario, y si las hay se pide
   * confirmación. Sin eso, quien edita ve un "guardado" y no sabe que la
   * próxima cita de ese profesional ya no encaja con la agenda.
   */
  const settings = await getClinicSettings();
  const supabase = await supabaseServer();

  const { data: citas, error: citasError } = await supabase.rpc("appointments_in_range", {
    p_from: new Date().toISOString(),
    p_to: new Date(Date.now() + settings.max_days_ahead * 86_400_000).toISOString(),
    p_doctor: doctorId,
  });

  if (citasError) {
    return NextResponse.json(
      { error: "No se pudieron revisar las citas existentes" },
      { status: 500 },
    );
  }

  const porDia = new Map<number, { start: string; end: string }[]>();
  for (const r of rules) {
    const lista = porDia.get(r.weekday) ?? [];
    lista.push({ start: r.startTime, end: r.endTime });
    porDia.set(r.weekday, lista);
  }

  type CitaRango = { id: string; during: string | Record<string, string> };

  const fuera = ((citas ?? []) as unknown as CitaRango[])
    .map((c) => {
      const start = parseAppointmentRange(c.during).start;
      const dia = weekdayOfKey(dateKey(start, settings.timezone));
      const hora = timeKey(start, settings.timezone);
      const franjas = porDia.get(dia) ?? [];
      const dentro = franjas.some((f) => toMinutes(hora) >= toMinutes(f.start) && toMinutes(hora) < toMinutes(f.end));
      return dentro
        ? null
        : { id: c.id, dia: dateKey(start, settings.timezone), hora };
    })
    .filter((c): c is { id: string; dia: string; hora: string } => c !== null);

  const confirm = raw && typeof raw === "object" ? (raw as { confirm?: boolean }).confirm === true : false;

  if (fuera.length > 0 && !confirm) {
    return NextResponse.json(
      {
        error: `Hay ${fuera.length} cita${fuera.length === 1 ? "" : "s"} que quedaría${fuera.length === 1 ? "" : "n"} fuera del nuevo horario`,
        code: "horario_fuera_de_rango",
        conflicts: fuera,
      },
      { status: 409 },
    );
  }

  const { error: rpcError } = await supabase.rpc("replace_availability_rules", {
    p_doctor: doctorId,
    p_rules: rules.map((r) => ({
      weekday: r.weekday,
      startTime: r.startTime,
      endTime: r.endTime,
    })),
  });

  if (rpcError) {
    const mensaje = rpcError.message.includes("violates row-level security")
      ? "No tienes permiso para cambiar el horario de este profesional"
      : "No se pudo guardar el horario";
    return NextResponse.json({ error: mensaje }, { status: 403 });
  }

  return NextResponse.json({ ok: true, rules: await loadRules(doctorId), warnings: fuera.length });
}