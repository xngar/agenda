import { NextResponse } from "next/server";
import { z } from "zod";
import { bookAppointment } from "@/lib/booking";
import { BusinessError } from "@/lib/errors";
import { checkRateLimit, clientIdentity } from "@/lib/ratelimit";
import { clientIp, verifyTurnstile } from "@/lib/turnstile";
import { patientDetailsSchema, uuidSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Reserva del paciente.
 *
 * Es el único camino de escritura hacia `appointments` para usuarios sin
 * sesión: todo pasa por `book_appointment` (SECURITY DEFINER), que
 * revalida la disponibilidad dentro de la misma transacción.
 */

const bodySchema = patientDetailsSchema.extend({
  serviceId: uuidSchema,
  doctorId: uuidSchema.nullable(),
  slotStart: z.string().min(10).max(40),
  turnstileToken: z.string().optional(),
});

function fieldOf(error: z.ZodError): string | undefined {
  const first = error.issues[0];
  return first?.path.join(".");
}

export async function POST(request: Request) {
  const identity = clientIdentity(request);

  const limit = await checkRateLimit("booking", identity, {
    requests: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (limit && !limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos de reserva. Intenta en unos minutos." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario",
        field: fieldOf(parsed.error),
      },
      { status: 422 },
    );
  }

  const turnstileOk = await verifyTurnstile(
    parsed.data.turnstileToken,
    clientIp(request),
  );
  if (!turnstileOk) {
    return NextResponse.json(
      { error: "No pudimos verificar que eres una persona. Recarga la página e intenta de nuevo." },
      { status: 422 },
    );
  }

  try {
    const result = await bookAppointment(parsed.data);
    return NextResponse.json(
      {
        manageUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/cita/${result.token}`,
        appointmentId: result.appointmentId,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof BusinessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    // Error inesperado: al cliente sólo un mensaje genérico. El detalle
    // va al log del servidor sin datos personales.
    console.error("[booking] error inesperado:", error instanceof Error ? error.name : "desconocido");
    return NextResponse.json(
      { error: "No pudimos completar la reserva. Intenta en unos minutos." },
      { status: 500 },
    );
  }
}