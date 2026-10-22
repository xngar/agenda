import { NextResponse } from "next/server";
import { z } from "zod";
import { getCatalog, getCatalogById, getService, getSlotsWithDoctor } from "@/lib/booking";
import { addDaysToKey, todayKey } from "@/lib/dates";
import { checkRateLimit, clientIdentity } from "@/lib/ratelimit";

const querySchema = z.object({
  clinicSlug: z.string().min(1).optional(),
  serviceId: z.string().uuid("Servicio inválido"),
});

/**
 * Primera hora libre con "cualquiera disponible".
 *
 * Recorre día por día desde hoy hasta `max_days_ahead` (saltando domingos
 * y feriados) y devuelve el primer día con horarios más esos horarios.
 * `min_notice_hours` ya lo filtra el RPC, igual que en `/api/slots`.
 *
 * Existe porque el asistente promete "la hora más temprana": pedirle al
 * paciente que pruebe días uno por uno hasta encontrar algo no es eso.
 * Un solo request acotado, con su propio rate limit.
 */
export async function GET(request: Request) {
  const limit = await checkRateLimit("slots-earliest", clientIdentity(request), {
    requests: 30,
    windowMs: 60_000,
  });
  if (limit && !limit.available) {
    return NextResponse.json(
      { error: "La consulta de horarios no está disponible temporalmente." },
      { status: 503 },
    );
  }
  if (limit && !limit.ok) {
    return NextResponse.json(
      { error: "Demasiadas consultas, espera un momento." },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    clinicSlug: url.searchParams.get("clinicSlug") ?? undefined,
    serviceId: url.searchParams.get("serviceId") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const service = await getService(parsed.data.serviceId);
  if (!service) {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 404 });
  }

  let catalog = null;
  try {
    catalog = parsed.data.clinicSlug
      ? await getCatalog(parsed.data.clinicSlug)
      : service.org_id
        ? await getCatalogById(service.org_id)
        : null;
  } catch {
    catalog = null;
  }
  if (!catalog) {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 404 });
  }
  const settings = catalog.settings;

  const orgId = typeof settings.id === "string" ? settings.id : null;
  const holidays = new Set(catalog.holidays.map((h) => h.date));
  const today = todayKey(settings.timezone);

  for (let i = 0; i <= settings.max_days_ahead; i++) {
    const date = addDaysToKey(today, i);
    if (new Date(`${date}T00:00:00Z`).getUTCDay() === 0) continue;
    if (holidays.has(date)) continue;

    const slots = await getSlotsWithDoctor(date, service.duration_min, null, orgId);
    if (slots.length > 0) {
      return NextResponse.json(
        { date, slots, durationMin: service.duration_min },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  return NextResponse.json(
    { date: null, slots: [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
