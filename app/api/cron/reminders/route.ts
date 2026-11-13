import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/lib/booking";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Recordatorios de cita automáticos según configuración por clínica.
 *
 * Alternativas de disparo, todas con la misma función:
 *  - Vercel Cron (`vercel.json` -> `crons`, usa GET con Bearer CRON_SECRET)
 *  - pg_cron con `net.http_post` (usa POST)
 *  - llamada manual con `curl -H "Authorization: Bearer $CRON_SECRET"`
 */
async function handleReminders(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 503 });
  }

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  const ok = a.length === b.length && timingSafeEqual(a, b);

  if (!ok) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const summary = await sendDueReminders();
  return NextResponse.json(summary);
}

export async function GET(request: Request) {
  return handleReminders(request);
}

export async function POST(request: Request) {
  return handleReminders(request);
}
