import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
  orgPatient,
} from "@/lib/ficha/http";
import { encounterSchema } from "@/lib/ficha/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { patient, error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const { data, error } = await ctx.supabase
    .from("encounters")
    .select("*, doctors!encounters_doctor_id_fkey (full_name)")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .order("started_at", { ascending: false });

  if (error) return dbError(error);

  return NextResponse.json({ patient, encounters: data ?? [] });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const raw = await request.json().catch(() => null);
  const body = encounterSchema.safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const { data, error } = await ctx.supabase
    .from("encounters")
    .insert({
      org_id: ctx.session.orgId,
      patient_id: id,
      doctor_id: ctx.session.id,
      specialty_data: body.data.specialty_data ?? {},
      appointment_id: body.data.appointment_id ?? null,
      started_at: body.data.started_at ? `${body.data.started_at}T00:00:00Z` : undefined,
      care_type: body.data.care_type ?? null,
      motivo: body.data.motivo ?? null,
      evolucion: body.data.evolucion ?? null,
      diagnostico: body.data.diagnostico ?? null,
      indicaciones: body.data.indicaciones ?? null,
      proxima_cita_at: body.data.proxima_cita_at ? `${body.data.proxima_cita_at}T00:00:00Z` : null,
    })
    .select()
    .single();

  if (error) return dbError(error);

  return NextResponse.json({ encounter: data }, { status: 201 });
}