import { NextResponse } from "next/server";
import { z } from "zod";
import { getDoctorSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const bodySchema = z.object({
  reminders_enabled: z.boolean(),
  reminder_hours_before: z.union([
    z.literal(12),
    z.literal(24),
    z.literal(48),
    z.literal(72),
  ]),
});

const MIGRATION_MESSAGE =
  "La configuración de recordatorios aún no está habilitada en la base de datos. Aplica la migración 20261113120000_org_reminders_config.sql y vuelve a intentarlo.";

function faltaMigracion(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message?.toLowerCase() ?? "";
  if (!msg.includes("reminders_enabled") && !msg.includes("reminder_hours_before")) return false;
  return error.code === "42703" || error.code === "PGRST204" || msg.includes("schema cache");
}

export async function PATCH(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json(
      { error: "Solo los administradores pueden configurar los recordatorios" },
      { status: 403 },
    );
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa los datos enviados" },
      { status: 422 },
    );
  }

  const { reminders_enabled, reminder_hours_before } = parsed.data;

  const { error } = await supabaseAdmin()
    .from("organizations")
    .update({
      reminders_enabled,
      reminder_hours_before,
    })
    .eq("id", session.orgId);

  if (error) {
    if (faltaMigracion(error)) {
      return NextResponse.json({ error: MIGRATION_MESSAGE }, { status: 503 });
    }
    return NextResponse.json(
      { error: "No se pudieron guardar las preferencias de recordatorios" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    reminders_enabled,
    reminder_hours_before,
  });
}

