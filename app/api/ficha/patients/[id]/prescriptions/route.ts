import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
  orgPatient,
  auditPatientView,
} from "@/lib/ficha/http";
import { prescriptionSchema } from "@/lib/ficha/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { patient, error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const { data, error } = await ctx.supabase
    .from("prescriptions")
    .select(
      "*, prescriber:doctors!prescriptions_created_by_fkey(full_name), encounter:encounters!prescriptions_encounter_id_fkey(started_at, care_type)",
    )
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  if (error) return dbError(error);

  const { data: encounters, error: encountersError } = await ctx.supabase
    .from("encounters")
    .select("id, started_at, care_type, doctors!encounters_doctor_id_fkey(full_name)")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .order("started_at", { ascending: false });

  if (encountersError) return dbError(encountersError);

  const auditError = await auditPatientView(ctx, id, "prescriptions");
  if (auditError) return auditError;

  return NextResponse.json({
    patient,
    prescriptions: data ?? [],
    encounters: encounters ?? [],
  });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const raw = await request.json().catch(() => null);
  const body = prescriptionSchema.omit({ patient_id: true }).safeParse(raw);
  if (!body.success) return bodyError(body.error);

  if (body.data.encounter_id) {
    const { data: encounter, error: encounterError } = await ctx.supabase
      .from("encounters")
      .select("id")
      .eq("id", body.data.encounter_id)
      .eq("org_id", ctx.session.orgId)
      .eq("patient_id", id)
      .maybeSingle();

    if (encounterError) return dbError(encounterError);
    if (!encounter) {
      return NextResponse.json(
        { error: "La atención seleccionada no corresponde a este paciente." },
        { status: 400 },
      );
    }
  }

  const { data, error } = await ctx.supabase
    .from("prescriptions")
    .insert({
      org_id: ctx.session.orgId,
      patient_id: id,
      encounter_id: body.data.encounter_id ?? null,
      medication: body.data.medication,
      dose: body.data.dose,
      route: body.data.route ?? null,
      frequency: body.data.frequency ?? null,
      duration: body.data.duration ?? null,
      created_by: ctx.session.id,
    })
    .select()
    .single();

  if (error) return dbError(error);

  return NextResponse.json({ prescription: data }, { status: 201 });
}