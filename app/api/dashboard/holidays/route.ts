import { NextResponse } from "next/server";
import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { holidaySchema } from "@/lib/validation";

/**
 * Feriados de la clínica: días en los que ningún profesional atiende y el
 * asistente público deja de ofrecer horas. Sólo la administradora los puede
 * crear o eliminar (política `admin_manage_holidays`); cualquiera los puede
 * leer (incluido el público, que los usa para calcular horarios).
 */

export async function GET() {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("clinic_holidays")
    .select("date, name")
    .order("date");

  if (error) {
    return NextResponse.json({ error: "No se pudieron leer los feriados" }, { status: 500 });
  }

  return NextResponse.json({
    holidays: (data ?? []).map((h) => ({
      date: h.date as string,
      name: h.name as string | null,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json(
      { error: "Sólo un administrador puede crear feriados" },
      { status: 403 },
    );
  }

  const raw = await request.json().catch(() => null);
  const body = holidaySchema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Revisa el feriado" },
      { status: 422 },
    );
  }

  const { date, name } = body.data;
  const supabase = await supabaseServer();

  const { data: repetido } = await supabase
    .from("clinic_holidays")
    .select("date")
    .eq("date", date);
  if (repetido && repetido.length > 0) {
    return NextResponse.json(
      { error: "Ese día ya es feriado", code: "feriado_duplicado" },
      { status: 409 },
    );
  }

  const { data: creado, error } = await supabase
    .from("clinic_holidays")
    .insert({ date, name })
    .select("date, name");

  if (error) {
    const permiso = error.message.includes("violates row-level security");
    return NextResponse.json(
      { error: permiso ? "No tienes permiso para esto" : "No se pudo guardar el feriado" },
      { status: permiso ? 403 : 500 },
    );
  }

  return NextResponse.json({ ok: true, holiday: creado?.[0] }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json(
      { error: "Sólo un administrador puede eliminar feriados" },
      { status: 403 },
    );
  }

  const raw = await request.json().catch(() => null);
  const { date } = (raw ?? {}) as { date?: string };
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Falta el día a eliminar" }, { status: 422 });
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("clinic_holidays")
    .delete()
    .eq("date", date)
    .select("date");

  if (error) {
    return NextResponse.json({ error: "No se pudo eliminar el feriado" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Ese día no es feriado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, date: data[0].date });
}