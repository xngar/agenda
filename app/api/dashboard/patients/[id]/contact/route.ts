import { NextResponse } from "next/server";
import { z } from "zod";
import { getDoctorSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bodySchema = z.object({
  channel: z.literal("whatsapp"),
});

/**
 * Registra el intento de contacto con un paciente. El mensaje se envía fuera
 * de la app (wa.me) y no se guarda: sólo queda el canal y el actor.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getDoctorSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Canal no válido" }, { status: 422 });
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("patient_contact_event", {
    p_patient_id: id,
    p_channel: body.data.channel,
  });

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }
    console.error("patient_contact_event", error);
    return NextResponse.json({ error: "No se pudo registrar el contacto" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
