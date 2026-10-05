import { NextResponse } from "next/server";
import { z } from "zod";
import { getService, getSlotsWithDoctor } from "@/lib/booking";
import { getCatalog } from "@/lib/booking";
import { isValidDayKey } from "@/lib/dates";
import { checkRateLimit, clientIdentity } from "@/lib/ratelimit";

const querySchema = z.object({
  date: z.string().min(1),
  serviceId: z.string().uuid("Servicio inválido"),
  /**
   * OJO: el preprocesado va ANTES de validar a propósito.
   *
   * El asistente manda `doctorId=` (cadena vacía) cuando el paciente elige
   * "Cualquiera disponible". Con
   *   z.string().uuid().transform(v => v === "" ? null : v)
   * el `.uuid()` valida primero, la cadena vacía falla y el `.transform()`
   * queda como código muerto: la API respondía 400 y el paso 3 no
   * mostraba ninguna hora. Por eso se normaliza en `z.preprocess`.
   */
  doctorId: z.preprocess(
    (v) => (v === "" || v === "any" || v === "null" ? undefined : v),
    z.string().uuid("Profesional inválido").optional(),
  ),
});

/**
 * Horarios de un día. Es público (no hay datos personales) pero va con
 * rate limit para que nadie lo use como raspador del calendario.
 */
export async function GET(request: Request) {
  const limit = await checkRateLimit("slots", clientIdentity(request), {
    requests: 120,
    windowMs: 60_000,
  });
  if (limit && !limit.ok) {
    return NextResponse.json(
      { error: "Demasiadas consultas, espera un momento." },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: url.searchParams.get("date") ?? "",
    serviceId: url.searchParams.get("serviceId") ?? "",
    doctorId: url.searchParams.get("doctorId") ?? undefined,
  });

  if (!parsed.success || !isValidDayKey(parsed.data.date)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const { date, serviceId, doctorId } = parsed.data;

  const service = await getService(serviceId);
  if (!service) {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 404 });
  }

  const catalog = await getCatalog();
  const settings = catalog.settings;

  // El servidor es quien decide el rango de fechas; el cliente no puede
  // ampliarlo pidiendo un año hacia adelante.
  const today = new Date();
  const santiagoToday = formatInSantiago(today);
  const diffDays = diffInDays(santiagoToday, date);
  if (diffDays < 0 || diffDays > settings.max_days_ahead) {
    return NextResponse.json({ slots: [], outOfRange: true });
  }

  const isHoliday = catalog.holidays.some((h) => h.date === date);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();

  if (isHoliday || weekday === 0) {
    return NextResponse.json({ slots: [], closed: true });
  }

  // Siempre por `getSlotsWithDoctor`, incluso cuando el paciente ya eligió
  // un profesional: así la respuesta trae siempre `doctor_id`. Antes se
  // llamaba directo a `getSlotsForDay` en ese caso y el campo desaparecía,
  // así que un cliente que copiaba el `doctor_id` del horario fallaba con 422
  // al reservar.
  const slots = await getSlotsWithDoctor(date, service.duration_min, doctorId ?? null);

  return NextResponse.json(
    { slots, durationMin: service.duration_min },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function formatInSantiago(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function diffInDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}