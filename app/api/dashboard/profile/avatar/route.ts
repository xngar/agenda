import { NextResponse } from "next/server";
import { getDoctorSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

const BUCKET = "perfil-profesionales";
const MAX_AVATAR_BYTES = 60 * 1024;
const MIGRATION_MESSAGE =
  "Las fotos de perfil aún no están habilitadas en la base de datos. Aplica la migración 20261023130000_doctor_profile_avatar.sql y vuelve a intentarlo.";

function faltaMigracionAvatar(error: { code?: string; message?: string } | null): boolean {
  if (!error?.message?.includes("avatar_path")) return false;
  return error.code === "42703" || error.code === "PGRST204" || error.message.toLowerCase().includes("schema cache");
}

async function perfilActual(id: string, orgId: string) {
  const supabase = await supabaseServer();
  return supabase
    .from("doctors")
    .select("avatar_path")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
}

export async function GET() {
  const session = await getDoctorSession();
  if (!session) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  if (session.isSuperAdmin) {
    return NextResponse.json({ error: "Esta ruta no es para el equipo de plataforma" }, { status: 403 });
  }

  const { data: profile, error: profileError } = await perfilActual(session.id, session.orgId);
  if (profileError || !profile) {
    if (faltaMigracionAvatar(profileError)) {
      return NextResponse.json({ error: MIGRATION_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: "No se pudo leer la foto del perfil" }, { status: 500 });
  }
  if (!profile.avatar_path) {
    return NextResponse.json({ error: "No hay foto de perfil" }, { status: 404 });
  }

  const { data: image, error } = await supabaseAdmin().storage
    .from(BUCKET)
    .download(profile.avatar_path);
  if (error || !image) {
    return NextResponse.json({ error: "No se pudo cargar la foto del perfil" }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(await image.arrayBuffer()), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const session = await getDoctorSession();
  if (!session) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  if (session.isSuperAdmin) {
    return NextResponse.json({ error: "Esta ruta no es para el equipo de plataforma" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_AVATAR_BYTES + 32 * 1024) {
    return NextResponse.json({ error: "La foto no puede superar 60 KB." }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const avatar = form?.get("avatar");
  if (!(avatar instanceof File)) {
    return NextResponse.json({ error: "Selecciona una imagen JPG válida." }, { status: 422 });
  }
  if (avatar.type !== "image/jpeg") {
    return NextResponse.json({ error: "La imagen debe estar optimizada en formato JPG." }, { status: 415 });
  }
  if (avatar.size === 0 || avatar.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "La foto no puede superar 60 KB." }, { status: 413 });
  }

  const bytes = new Uint8Array(await avatar.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return NextResponse.json({ error: "El archivo no contiene una imagen JPG válida." }, { status: 415 });
  }

  const admin = supabaseAdmin();
  const { data: current, error: readError } = await perfilActual(session.id, session.orgId);
  if (readError || !current) {
    if (faltaMigracionAvatar(readError)) {
      return NextResponse.json({ error: MIGRATION_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: "No se pudo leer el perfil" }, { status: 500 });
  }

  const path = `${session.orgId}/${session.id}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: "No se pudo guardar la foto del perfil" }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("doctors")
    .update({ avatar_path: path })
    .eq("id", session.id)
    .eq("org_id", session.orgId);

  if (updateError) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
  }

  if (current.avatar_path) {
    const { error: removeError } = await admin.storage.from(BUCKET).remove([current.avatar_path]);
    if (removeError) {
      return NextResponse.json({
        ok: true,
        warning: "La foto se actualizó, pero no se pudo limpiar la imagen anterior.",
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getDoctorSession();
  if (!session) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  if (session.isSuperAdmin) {
    return NextResponse.json({ error: "Esta ruta no es para el equipo de plataforma" }, { status: 403 });
  }

  const admin = supabaseAdmin();
  const { data: current, error: readError } = await perfilActual(session.id, session.orgId);
  if (readError || !current) {
    if (faltaMigracionAvatar(readError)) {
      return NextResponse.json({ error: MIGRATION_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: "No se pudo leer el perfil" }, { status: 500 });
  }
  if (!current.avatar_path) return NextResponse.json({ ok: true });

  const { error: updateError } = await admin
    .from("doctors")
    .update({ avatar_path: null })
    .eq("id", session.id)
    .eq("org_id", session.orgId);
  if (updateError) {
    return NextResponse.json({ error: "No se pudo quitar la foto del perfil" }, { status: 500 });
  }

  const { error: removeError } = await admin.storage.from(BUCKET).remove([current.avatar_path]);
  if (removeError) {
    return NextResponse.json({
      ok: true,
      warning: "La foto se quitó del perfil, pero no se pudo limpiar el archivo anterior.",
    });
  }
  return NextResponse.json({ ok: true });
}
