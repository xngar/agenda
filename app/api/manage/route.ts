import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelByToken, getAppointmentByToken, rescheduleByToken, toPatientView } from "@/lib/booking";
import { BusinessError } from "@/lib/errors";
import { checkRateLimit, clientIdentity } from "@/lib/ratelimit";
import { isManageTokenShape } from "@/lib/token";
import { cancelSchema, rescheduleSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Gestión de la cita con el token (reprogramar / cancelar).
 *
 * El token viaja en el cuerpo del POST, no en la query, para que las
 * mutaciones no queden en los logs del servidor. Ojo: el token sí está en
 * la ruta de la página (`/cita/[token]`) porque ese es el enlace que va en
 * el correo; la mitigación real de eso es `Referrer-Policy: no-referrer`
 * (ver next.config.ts) más `Cache-Control: no-store` en las respuestas.
 *
 * La comparación real la hace Postgres sobre el hash SHA-256; acá sólo
 * validamos la forma para no gastar una consulta con basura.
 */

const tokenSchema = z.string().length(64).regex(/^[0-9a-f]{64}$/);

const rescheduleBody = z.object({
  token: tokenSchema,
  ...rescheduleSchema.shape,
});

const cancelBody = z.object({
  token: tokenSchema,
  ...cancelSchema.shape,
});

const limits = { requests: 20, windowMs: 15 * 60 * 1000 } as const;

export async function POST(request: Request) {
  const identity = clientIdentity(request);

  const limit = await checkRateLimit("manage", identity, limits);
  if (limit && !limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const action = request.headers.get("x-action");

  if (action === "reschedule") {
    const parsed = rescheduleBody.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 422 },
      );
    }
    if (!isManageTokenShape(parsed.data.token)) {
      return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
    }

    try {
      const { appointment } = await rescheduleByToken(
        parsed.data.token,
        parsed.data.slotStart,
        parsed.data.doctorId ?? null,
      );
      return NextResponse.json({ appointment });
    } catch (error) {
      return toResponse(error);
    }
  }

  if (action === "cancel") {
    const parsed = cancelBody.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 422 },
      );
    }
    if (!isManageTokenShape(parsed.data.token)) {
      return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
    }

    try {
      const appointment = await cancelByToken(parsed.data.token, parsed.data.reason);
      return NextResponse.json({ appointment });
    } catch (error) {
      return toResponse(error);
    }
  }

  return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
}

/** Lectura de la cita por token (usada al abrir /cita/[token]). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  const limit = await checkRateLimit("manage", clientIdentity(request), limits);
  if (limit && !limit.ok) {
    return NextResponse.json({ error: "Demasiados intentos." }, { status: 429 });
  }

  if (!isManageTokenShape(token)) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }

  const found = await getAppointmentByToken(token);
  if (!found) {
    return NextResponse.json({ error: "Enlace no válido o cita no encontrada" }, { status: 404 });
  }

  const appointment = await toPatientView(found.row);

  // "El token deja de servir cuando la cita pasó": se responde 410 para
  // que el navegador no la deje cacheada.
  if (new Date(appointment.endsAt).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Esta cita ya fue realizada o cancelada." },
      { status: 410 },
    );
  }

  return NextResponse.json({ appointment }, { headers: { "Cache-Control": "no-store" } });
}

function toResponse(error: unknown): NextResponse {
  if (error instanceof BusinessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error("[manage] error inesperado:", error instanceof Error ? error.name : "desconocido");
  return NextResponse.json({ error: "No pudimos completar la operación." }, { status: 500 });
}