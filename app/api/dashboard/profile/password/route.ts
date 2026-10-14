import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDoctorSession } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { profilePasswordSchema } from "@/lib/validation";

/**
 * Cambio de contraseña propia para clínica (profesional, recepción, admin).
 *
 * Replica el patrón de `/api/platform/rotar-password`: exige la clave
 * actual (una sesión abierta no basta), la verifica con un signIn efímero
 * contra un cliente anónimo separado —para no contaminar el singleton
 * admin con un JWT de usuario— y luego la reemplaza con
 * `admin.updateUserById`. Queda rastro en `audit_log`.
 */
export async function POST(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }
  if (session.isSuperAdmin) {
    return NextResponse.json(
      { error: "Usa la sección Seguridad de plataforma para tu contraseña" },
      { status: 403 },
    );
  }

  const raw = await request.json().catch(() => null);
  const body = profilePasswordSchema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Revisa los datos" },
      { status: 422 },
    );
  }
  if (body.data.actual === body.data.nueva) {
    return NextResponse.json(
      { error: "La nueva contraseña debe ser distinta a la actual" },
      { status: 422 },
    );
  }

  const supabase = supabaseAdmin();
  const { data: usuario } = await supabase.auth.admin.getUserById(session.id);
  const email = usuario?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "No se pudo verificar tu cuenta" }, { status: 500 });
  }

  const anonimo = createClient(
    serverEnv().NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const verificada = await anonimo.auth.signInWithPassword({
    email,
    password: body.data.actual,
  });
  if (verificada.error) {
    return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 401 });
  }
  await anonimo.auth.signOut().catch(() => null);

  const { error: cambioError } = await supabase.auth.admin.updateUserById(session.id, {
    password: body.data.nueva,
  });
  if (cambioError) {
    return NextResponse.json({ error: "No se pudo actualizar la contraseña" }, { status: 500 });
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    org_id: session.orgId,
    actor_id: session.id,
    action: "update",
    entity: "doctors",
    entity_id: session.id,
    summary: { cambio_password_propio: true },
  });
  if (auditError) {
    return NextResponse.json({ error: "No se pudo registrar la auditoría" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
