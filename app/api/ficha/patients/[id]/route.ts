import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  bodyError,
  dbError,
} from "@/lib/ficha/http";
import { patientBaseSchema } from "@/lib/ficha/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;

  const { data: patient, error } = await ctx.supabase
    .from("patients")
    .select("*, patient_medical_background (*)")
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();

  if (error) return dbError(error);
  if (!patient) return notFound("Paciente no encontrado");

  return NextResponse.json({ patient });
}

export async function PUT(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const raw = await request.json().catch(() => null);
  const body = patientBaseSchema.safeParse(raw);
  if (!body.success) return bodyError(body.error);

  const { data: existe, error: existeError } = await ctx.supabase
    .from("patients")
    .select("id,full_name,nombres,apellido_paterno,apellido_materno,specialty_profile")
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();
  if (existeError) return dbError(existeError);
  if (!existe) return notFound("Paciente no encontrado");

  const data = body.data;
  const patch: Record<string, unknown> = { ...data };

  if (data.specialty_profile) {
    patch.specialty_profile = {
      ...(existe.specialty_profile as Record<string, unknown> | null),
      ...data.specialty_profile,
    };
  }

  if (data.full_name === undefined && (data.nombres || data.apellido_paterno || data.apellido_materno)) {
    patch.full_name =
      [data.nombres ?? existe.nombres, data.apellido_paterno ?? existe.apellido_paterno, data.apellido_materno ?? existe.apellido_materno]
        .filter(Boolean)
        .join(" ")
        .trim();
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