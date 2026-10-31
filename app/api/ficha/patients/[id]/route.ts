import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  bodyError,
  dbError,
  orgPatient,
  patientAccess,
  auditPatientView,
} from "@/lib/ficha/http";
import { patientBaseSchema } from "@/lib/ficha/schemas";
import { validateProfile } from "@/lib/ficha/definitions";

type Params = { params: Promise<{ id: string }> };

const ADMIN_PATIENT_FIELDS = [
  "nombres",
  "apellido_paterno",
  "apellido_materno",
  "full_name",
  "rut",
  "birth_date",
  "sex",
  "nationality",
  "marital_status",
  "occupation",
  "address",
  "comuna",
  "region",
  "prevision_type",
  "fonasa_tramo",
  "isapre_name",
  "isapre_plan",
  "emergency_name",
  "emergency_relation",
  "emergency_phone",
  "tutor_name",
  "tutor_rut",
  "tutor_relation",
  "tutor_phone",
  "referral_source",
  "phone",
  "email",
] as const;

const ADMIN_PATIENT_SELECT =
  "id,org_id,doctor_id,full_name,nombres,apellido_paterno,apellido_materno,rut,phone,email,birth_date,sex,nationality,marital_status,occupation,address,comuna,region,prevision_type,fonasa_tramo,isapre_name,isapre_plan,emergency_name,emergency_relation,emergency_phone,tutor_name,tutor_rut,tutor_relation,tutor_phone,referral_source,patient_status,admitted_at,consent_at,created_at,updated_at,doctors (full_name)";

function adminFields(patient: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const key of ADMIN_PATIENT_FIELDS) {
    if (key in patient) filtered[key] = patient[key];
  }
  filtered.id = patient.id;
  filtered.org_id = patient.org_id;
  filtered.doctor_id = patient.doctor_id;
  filtered.patient_status = patient.patient_status;
  filtered.admitted_at = patient.admitted_at;
  filtered.consent_at = patient.consent_at;
  filtered.created_at = patient.created_at;
  filtered.updated_at = patient.updated_at;
  filtered.doctors = patient.doctors;
  return filtered;
}

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical && ctx.session.role !== "reception") return forbidden();

  const { id } = await params;

  if (ctx.session.role === "reception" && !ctx.clinical) {
    const { data: patient, error } = await ctx.supabase
      .from("patients")
      .select(ADMIN_PATIENT_SELECT)
      .eq("org_id", ctx.session.orgId)
      .eq("id", id)
      .maybeSingle();

    if (error) return dbError(error);
    if (!patient) return notFound("Paciente no encontrado");

    return NextResponse.json({ patient });
  }

  const { error: accessError } = await orgPatient(ctx, id);
  if (accessError) return accessError;

  const { data: patient, error } = await ctx.supabase
    .from("patients")
    .select("*, doctors (full_name), patient_medical_background (*)")
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();

  if (error) return dbError(error);
  if (!patient) return notFound("Paciente no encontrado");
  const auditError = await auditPatientView(ctx, id, "patients");
  if (auditError) return auditError;

  return NextResponse.json({ patient });
}

export async function PUT(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical && ctx.session.role !== "reception") return forbidden();

  const { id } = await params;
  const raw = await request.json().catch(() => null);
  const body = patientBaseSchema.safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const { data: existe, error: existeError } = await ctx.supabase
    .from("patients")
    .select("id,full_name,nombres,apellido_paterno,apellido_materno,specialty_profile,doctor_id")
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();
  if (existeError) return dbError(existeError);
  if (!existe) return notFound("Paciente no encontrado");

  const access = await patientAccess(ctx, existe);
  if (!access.canEditIdentity) {
    return forbidden("No tienes relación con la atención de este paciente");
  }

  const data = body.data;
  const patch: Record<string, unknown> = { ...data };

  if (data.full_name === undefined && (data.nombres || data.apellido_paterno || data.apellido_materno)) {
    patch.full_name =
      [data.nombres ?? existe.nombres, data.apellido_paterno ?? existe.apellido_paterno, data.apellido_materno ?? existe.apellido_materno]
        .filter(Boolean)
        .join(" ")
        .trim();
  }

  if (access.isReception) {
    if (data.specialty_profile !== undefined) {
      return forbidden("La recepción no puede modificar el contenido clínico del paciente");
    }
    for (const key of Object.keys(patch)) {
      if (!(ADMIN_PATIENT_FIELDS as readonly string[]).includes(key)) {
        delete patch[key];
      }
    }

    const { data: actualizado, error } = await ctx.supabase.rpc("update_patient_admin", {
      p_patient_id: id,
      p_patch: patch,
    });
    if (error) {
      if (error.code === "22023") {
        return forbidden("La recepción sólo puede modificar datos administrativos");
      }
      return dbError(error);
    }

    return NextResponse.json({
      patient: actualizado
        ? adminFields(actualizado as Record<string, unknown>)
        : actualizado,
    });
  }

  if (data.specialty_profile) {
    if (!access.canEditClinical) {
      return forbidden("No puedes modificar el perfil clínico de este paciente");
    }
    const perfil = validateProfile(ctx.session.orgType, {
      ...((existe.specialty_profile as Record<string, unknown> | null) ?? {}),
      ...data.specialty_profile,
    });
    if (!perfil.success) return bodyError(perfil.error);
    patch.specialty_profile = perfil.data;
  }

  const { data: actualizado, error } = await ctx.supabase
    .from("patients")
    .update(patch)
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return dbError(error);

  return NextResponse.json({ patient: actualizado });
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;

  const { access, error } = await orgPatient(ctx, id);
  if (error) return error;

  if (!access?.canDelete) {
    return forbidden("Solo el profesional tratante principal o el administrador puede archivar al paciente");
  }

  const { data: actualizado, error: updateError } = await ctx.supabase
    .from("patients")
    .update({ patient_status: "inactive" })
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (updateError) return dbError(updateError);
  if (!actualizado) return notFound("Paciente no encontrado");

  return NextResponse.json({ ok: true, archived: true });
}
