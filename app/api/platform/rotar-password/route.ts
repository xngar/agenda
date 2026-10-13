import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getDoctorSession } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

const rotarSchema = z.object({
  actual: z.string().min(1, "Ingresa tu contraseña actual"),
  nueva: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña es demasiado larga"),
});

/** Sólo el equipo de la plataforma rota su propia contraseña. */
async function plataformaAdmin(
  supabase: ReturnType<typeof supabaseAdmin>,
  doctorId: string,
): Promise<boolean> {
  const { data } = await supabase.from("doctors").select("is_super_admin").eq("id", doctorId).maybeSingle();
  return Boolean(data?.is_super_admin);
}

/**
 * Rotación de la contraseña del super-admin.
 *
 * A diferencia del restablecimiento para clínicas (que impone una clave sin
 * conocer la anterior y está bloqueado para el equipo de plataforma), acá
 * se exige la contraseña actual: una sesión abierta no basta para
 * cambiarla. Queda rastro en la auditoría y las sesiones se revocan, así
 * que el cliente debe volver a entrar.
 */
export async function POST(request: Request) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  if (!(await plataformaAdmin(supabase, session.id))) {
    return NextResponse.json(
      { error: "Sólo el equipo de la plataforma puede rotar su contraseña" },
      { status: 403 },
    );
  }

  const raw = await request.json().catch(() => null);
  const body = rotarSchema.safeParse(raw);
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

  const { data: usuario } = await supabase.auth.admin.getUserById(session.id);
  const email = usuario?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "No se pudo verificar tu cuenta" }, { status: 500 });
  }

  // Cliente efímero SÓLO para verificar la clave: un signIn sobre el cliente
  // admin (singleton del proceso) reemplazaría su Authorization por el JWT
  // del usuario y desde ahí TODO correría con RLS en vez de service role.
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
    return NextResponse.json(
      { error: "La contraseña actual no es correcta" },
      { status: 401 },
    );
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
    summary: { rotacion_password: true },
  });
  if (auditError) {
    return NextResponse.json({ error: "No se pudo registrar la auditoría" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
