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
import { chartEntrySchema } from "@/lib/ficha/schemas";
import { toothFaces } from "@/lib/ficha/dental";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const requestedTooth = new URL(request.url).searchParams.get("tooth");
  const tooth = requestedTooth === null ? null : Number(requestedTooth);
  if (requestedTooth !== null && (tooth === null || !Number.isInteger(tooth) || tooth < 11 || tooth > 85)) {
    return bodyError({ issues: [{ message: "Número de pieza inválido" }] });
  }

  const { patient, error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  let chartQuery = ctx.supabase
    .from("dental_chart_entries")
    .select("id,tooth,dentition,face,state,current,recorded_at,created_at,created_by,encounter_id")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id);
  chartQuery = tooth === null
    ? chartQuery.eq("current", true)
    : chartQuery.eq("tooth", tooth);

  const { data, error } = await chartQuery
    .order("recorded_at", { ascending: false });

  if (error) return dbError(error);

  let chart = data ?? [];
  if (tooth !== null && chart.length > 0) {
    const encounterIds = [...new Set(chart.flatMap((entry) => entry.encounter_id ? [entry.encounter_id] : []))];
    const creatorIds = [...new Set(chart.flatMap((entry) => entry.created_by ? [entry.created_by] : []))];
    let encounterRows: { id: string; started_at: string; care_type: string | null; doctor_id: string }[] = [];
    if (encounterIds.length > 0) {
      const { data: encounters, error: encounterError } = await ctx.supabase
        .from("encounters")
        .select("id,started_at,care_type,doctor_id")
        .eq("org_id", ctx.session.orgId)
        .eq("patient_id", id)
        .in("id", encounterIds);
      if (encounterError) return dbError(encounterError);
      encounterRows = encounters ?? [];
    }

    const doctorIds = [...new Set([
      ...creatorIds,
      ...encounterRows.map((encounter) => encounter.doctor_id),
    ])];
    let doctors: { id: string; full_name: string }[] = [];
    if (doctorIds.length > 0) {
      const { data: doctorRows, error: doctorError } = await ctx.supabase
        .from("doctors")
        .select("id,full_name")
        .eq("org_id", ctx.session.orgId)
        .in("id", doctorIds);
      if (doctorError) return dbError(doctorError);
      doctors = doctorRows ?? [];
    }

    const doctorNames = new Map(doctors.map((doctor) => [doctor.id, doctor.full_name]));
    const encounterById = new Map(encounterRows.map((encounter) => [encounter.id, encounter]));
    chart = chart.map((entry) => {
      const encounter = entry.encounter_id ? encounterById.get(entry.encounter_id) : undefined;
      return {
        ...entry,
        created_by_name: entry.created_by ? doctorNames.get(entry.created_by) ?? null : null,
        encounter_started_at: encounter?.started_at ?? null,
        encounter_care_type: encounter?.care_type ?? null,
        encounter_doctor_name: encounter ? doctorNames.get(encounter.doctor_id) ?? null : null,
      };
    });
  }

  const auditError = await auditPatientView(ctx, id, "dental_chart_entries");
  if (auditError) return auditError;

  return NextResponse.json({ patient, chart });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const raw = await request.json().catch(() => null);
  const incoming = (Array.isArray(raw) ? raw : raw?.entries);
  if (!Array.isArray(incoming) || !incoming.length) {
    return bodyError({ issues: [{ message: "Indica al menos un diente" }] });
  }

  const items = [];
  for (const item of incoming) {
    const parsed = chartEntrySchema.omit({ patient_id: true, dentition: true }).safeParse(item);
    if (!parsed.success) return bodyError(parsed.error);
    if (!parsed.data.encounter_id) {
      return bodyError({ issues: [{ message: "Asocia los cambios a una atención clínica abierta" }] });
    }
    items.push(parsed.data);
  }

  const encounterIds = [...new Set(items.flatMap((item) => item.encounter_id ? [item.encounter_id] : []))];
  const { data: encounters, error: encounterError } = await ctx.supabase
    .from("encounters")
    .select("id")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .eq("status", "draft")
    .in("id", encounterIds);
  if (encounterError) return dbError(encounterError);
  if ((encounters ?? []).length !== encounterIds.length) {
    return bodyError({ issues: [{ message: "La atención elegida no está abierta o no corresponde a este paciente" }] });
  }

  const rows = items.map((item) => ({
    org_id: ctx.session.orgId,
    patient_id: id,
    encounter_id: item.encounter_id,
    tooth: item.tooth,
    dentition: item.tooth > 48 ? "deciduous" : "permanent",
    face: item.face,
    state: item.state,
    created_by: ctx.session.id,
    recorded_at: item.recorded_at ? `${item.recorded_at}T00:00:00Z` : new Date().toISOString(),
  }));

  for (const row of rows) {
    if (!toothFaces(row.tooth).includes(row.face)) {
      return bodyError({ issues: [{ message: `Cara inválida para la pieza ${row.tooth}` }] });
    }
  }

  const { data, error } = await ctx.supabase
    .from("dental_chart_entries")
    .insert(rows)
    .select();

  if (error) return dbError(error);

  return NextResponse.json({ chart: data ?? [] }, { status: 201 });
}