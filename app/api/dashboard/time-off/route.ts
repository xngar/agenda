import { NextResponse } from "next/server";
import { getOrgSettings, getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { dateKey, timeKey } from "@/lib/dates";
import { parseAppointmentRange } from "@/lib/range";
import { timeOffSchema } from "@/lib/validation";

/**
 * Bloqueos de tiempo (vacaciones, colación, ausencias).
 *
 * Un bloqueo NO borra citas: sólo deja de ofrecer esas horas en el
 * asistente público. Por eso, igual que al cambiar el horario, antes de
 * aplicarlo se listan las citas que quedarían dentro del rango y se pide
 * confirmación.
 *
 * La autorización la decide RLS (`doctor_id = auth.uid() OR is_admin()` en
 * la migración 0004). El chequeo de abajo sólo sirve para devolver un 403
 * con mensaje legible en vez de un error crudo de Postgres.
 */

async function leerBloqueos(doctorId: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("time_off")
    .select("id, during, reason")
    .eq("doctor_id", doctorId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const { start, end } = parseAppointmentRange(
      row.during as unknown as string | Record<string, string>,
    );
    return { id: row.id as string, startsAt: start, endsAt: end, reason: row.reason as string | null };
  });
}

export async function GET(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const doctorId = new URL(request.url).searchParams.get("doctorId") ?? session.id;
  if (doctorId !== session.id && !session.isAdmin) {
    return NextResponse.json(
      { error: "Sólo puedes ver tus propios bloqueos" },
      { status: 403 },
    );
  }

  try {
    return NextResponse.json({ doctorId, blocks: await leerBloqueos(doctorId) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron leer los bloqueos" },
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
  const body = timeOffSchema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Revisa el bloqueo" },
      { status: 422 },
    );
  }

  const { doctorId, startsAt, endsAt, reason } = body.data;

  if (doctorId !== session.id && !session.isAdmin) {
    return NextResponse.json(
      { error: "Sólo puedes bloquear tu propio tiempo" },
      { status: 403 },
    );
  }

  const settings = await getOrgSettings(session.orgId);
  const supabase = await supabaseServer();

  const { data: citas, error: citasError } = await supabase.rpc("appointments_in_range", {
    p_from: startsAt,
    p_to: endsAt,
    p_doctor: doctorId,
  });

  if (citasError) {
    return NextResponse.json(
      { error: "No se pudieron revisar las citas existentes" },
      { status: 500 },
    );
  }

  type Cita = { id: string; during: string | Record<string, string> };
  const afectadas = ((citas ?? []) as unknown as Cita[]).map((c) => {
    const { start } = parseAppointmentRange(c.during);
    return {
      id: c.id,
      dia: dateKey(start, settings.timezone),
      hora: timeKey(start, settings.timezone),
    };
  });

  const confirm = raw !== null && (raw as { confirm?: boolean }).confirm === true;
  if (afectadas.length > 0 && !confirm) {
    return NextResponse.json(
      {
        error: `Hay ${afectadas.length} cita${afectadas.length === 1 ? "" : "s"} dentro de ese bloqueo`,
        code: "bloqueo_con_citas",
        conflicts: afectadas,
      },
      { status: 409 },
    );
  }

  // El rango va como texto de `tstzrange` abierto arriba, cerrado abajo:
  // el asistente ofrece `[inicio, fin)`, así que una cita que empieza
  // exactamente a la hora del cierre sigue estando fuera.
  const { data: creado, error: insertError } = await supabase
    .from("time_off")
    .insert({
      doctor_id: doctorId,
      during: `[${startsAt},${endsAt})`,
      reason: reason ?? null,
      org_id: session.orgId,
    })
    .select("id, during, reason");

  if (insertError) {
    const permiso = insertError.message.includes("violates row-level security");
    return NextResponse.json(
      {
        error: permiso
          ? "No tienes permiso para bloquear el tiempo de este profesional"
          : "No se pudo guardar el bloqueo",
      },
      { status: permiso ? 403 : 500 },
    );
  }

  const fila = creado?.[0];
  const { start, end } = parseAppointmentRange(
    fila?.during as unknown as string | Record<string, string>,
  );

  return NextResponse.json(
    {
      ok: true,
      block: { id: fila?.id, startsAt: start, endsAt: end, reason: fila?.reason ?? null },
      warnings: afectadas.length,
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const id = raw && typeof raw === "object" ? (raw as { id?: string }).id : undefined;
  if (!id) {
    return NextResponse.json({ error: "Falta el bloqueo a eliminar" }, { status: 422 });
  }

  const supabase = await supabaseServer();
  // Sin `.select()` la base no devuelve filas, así que RLS no puede decidir:
  // se borra lo que RLS permita leer y, si no fue nada, se responde 404.
  const { data, error } = await supabase.from("time_off").delete().eq("id", id).select("id");

  if (error) {
    return NextResponse.json({ error: "No se pudo eliminar el bloqueo" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Bloqueo no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: data[0].id });
}
