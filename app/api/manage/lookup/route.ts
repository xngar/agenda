import { NextResponse } from "next/server";
import { z } from "zod";
import { requestAppointmentAccess } from "@/lib/booking";
import { BusinessError } from "@/lib/errors";
import { checkRateLimit, clientIdentity } from "@/lib/ratelimit";

export const runtime = "nodejs";

const lookupSchema = z.object({
  clinicSlug: z.string().min(1, "Clínica requerida"),
  rut: z.string().optional(),
  email: z.string().optional(),
});

const limits = { requests: 6, windowMs: 10 * 60 * 1000 } as const;

export async function POST(request: Request) {
  const identity = clientIdentity(request);

  const limit = await checkRateLimit("manage-lookup", identity, limits);
  if (limit && !limit.available) {
    return NextResponse.json(
      { error: "La búsqueda de citas no está disponible temporalmente." },
      { status: 503 },
    );
  }
  if (limit && !limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Por seguridad, espera 10 minutos antes de intentar de nuevo." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }

  const parsed = lookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos no válidos" },
      { status: 422 },
    );
  }

  const { clinicSlug, rut, email } = parsed.data;

  if (!rut?.trim() && !email?.trim()) {
    return NextResponse.json(
      { error: "Por favor ingresa tu RUT o tu correo electrónico." },
      { status: 422 },
    );
  }

  try {
    const result = await requestAppointmentAccess({
      clinicSlug: clinicSlug.trim(),
      rut: rut?.trim() || undefined,
      email: email?.trim() || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BusinessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("[lookup] error inesperado:", error);
    return NextResponse.json(
      { error: "No pudimos procesar tu solicitud en este momento." },
      { status: 500 },
    );
  }
}
