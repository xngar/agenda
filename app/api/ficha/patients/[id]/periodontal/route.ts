import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  conflictMessage,
  bodyError,
  dbError,
  orgPatient,
  auditPatientView,
} from "@/lib/ficha/http";
import { periodontalSchema } from "@/lib/ficha/schemas";
import type { PeriodontalRecord } from "@/lib/ficha/types";

type Params = { params: Promise<{ id: string }> };

interface PeriodontalRecordRow extends PeriodontalRecord {
  author_id: string | null;
  can_correct: boolean;
}

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { patient, error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const { data, error } = await ctx.supabase
    .from("periodontal_records")
    .select("*")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .order("recorded_at", { ascending: false });

  if (error) return dbError(error);

  const rows = (data ?? []) as unknown as PeriodontalRecord[];
  const encounterIds = [
    ...new Set(rows.flatMap((row) => (row.encounter_id ? [row.encounter_id] : []))),
  ];
  const encounterDoctors = new Map<string, string | null>();
  if (encounterIds.length > 0) {
    const { data: encounters, error: encounterError } = await ctx.supabase
      .from("encounters")
      .select("id, doctor_id")
      .in("id", encounterIds);
    if (encounterError) return dbError(encounterError);
    for (const encounter of encounters ?? []) {
      encounterDoctors.set(encounter.id, encounter.doctor_id);
    }
  }

  const records: PeriodontalRecordRow[] = rows.map((record) => {
    const authorId =
      record.created_by ??
      (record.encounter_id ? (encounterDoctors.get(record.encounter_id) ?? null) : null);
    return {
      ...record,
      author_id: authorId,
      can_correct: record.status === "vigente" && authorId === ctx.session.id,
    };
  });

  const auditError = await auditPatientView(ctx, id, "periodontal_records");
  if (auditError) return auditError;

  return NextResponse.json({ patient, records });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { error: patientError } = await orgPatient(ctx, id);
  if (patientError) return patientError;

  const raw = await request.json().catch(() => null);
  const body = periodontalSchema.omit({ patient_id: true }).safeParse(raw);
  if (!body.success) return bodyError(body.error);
  if (!body.data.encounter_id) {
    return bodyError({ issues: [{ message: "Asocia el registro a una atención en borrador" }] });
  }

  const { data: encounter, error: encounterError } = await ctx.supabase
    .from("encounters")
    .select("id")
    .eq("org_id", ctx.session.orgId)
    .eq("patient_id", id)
    .eq("status", "draft")
    .eq("doctor_id", ctx.session.id)
    .eq("id", body.data.encounter_id)
    .maybeSingle();
  if (encounterError) return dbError(encounterError);
  if (!encounter) {
    return bodyError({
      issues: [
        {
          message:
            "La atención elegida no está abierta, no es tuya o no corresponde a este paciente",
        },
      ],
    });
  }

  const replacesId = body.data.replaces_id ?? null;
  const correctionReason = body.data.correction_reason?.trim() ?? null;
  if (replacesId && (!correctionReason || correctionReason.length < 3)) {
    return bodyError({
      issues: [{ message: "Indica el motivo de la corrección (mínimo 3 caracteres)" }],
    });
  }

  if (replacesId) {
    const { data: original, error: originalError } = await ctx.supabase
      .from("periodontal_records")
      .select("id, created_by, encounter_id, status")
      .eq("id", replacesId)
      .eq("org_id", ctx.session.orgId)
      .eq("patient_id", id)
      .maybeSingle();
    if (originalError) return dbError(originalError);
    if (!original) return notFound("Registro periodontal no encontrado");
    if (original.status !== "vigente") {
      return conflictMessage(
        "El registro periodontal ya fue reemplazado",
        "periodontal_ya_reemplazado",
      );
    }

    let authorId = original.created_by;
    if (!authorId && original.encounter_id) {
      const { data: originalEncounter, error: originalEncounterError } = await ctx.supabase
        .from("encounters")
        .select("doctor_id")
        .eq("id", original.encounter_id)
        .maybeSingle();
      if (originalEncounterError) return dbError(originalEncounterError);
      authorId = originalEncounter?.doctor_id ?? null;
    }

    if (authorId !== ctx.session.id) {
      return forbidden("Solo el autor del registro puede corregirlo");
    }
  }

  const { data, error } = await ctx.supabase
    .from("periodontal_records")
    .insert({
      org_id: ctx.session.orgId,
      patient_id: id,
      encounter_id: body.data.encounter_id,
      tooth: body.data.tooth,
      depths: body.data.depths ?? {},
      bleeding_on_probing: body.data.bleeding_on_probing ?? null,
      recession: body.data.recession ?? null,
      mobility: body.data.mobility,
      furcation: body.data.furcation ?? null,
      diagnosis: body.data.diagnosis ?? null,
      recorded_at: body.data.recorded_at ? `${body.data.recorded_at}T00:00:00Z` : undefined,
      created_by: ctx.session.id,
      replaces_id: replacesId,
      correction_reason: replacesId ? correctionReason : null,
    })
    .select()
    .single();

  if (error) return dbError(error);

  return NextResponse.json({ record: data }, { status: 201 });
}