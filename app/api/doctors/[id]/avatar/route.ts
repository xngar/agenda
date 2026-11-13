import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "perfil-profesionales";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Profesional no encontrado" }, { status: 404 });
  }

  const admin = supabaseAdmin();
  const { data: doctor, error: doctorError } = await admin
    .from("doctors")
    .select("id, active, role, avatar_path")
    .eq("id", id)
    .maybeSingle();

  if (
    doctorError ||
    !doctor ||
    !doctor.active ||
    doctor.role !== "professional" ||
    !doctor.avatar_path
  ) {
    return NextResponse.json({ error: "Foto no disponible" }, { status: 404 });
  }

  const { data: image, error: storageError } = await admin.storage
    .from(BUCKET)
    .download(doctor.avatar_path);

  if (storageError || !image) {
    return NextResponse.json({ error: "Foto no disponible" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(await image.arrayBuffer()), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

