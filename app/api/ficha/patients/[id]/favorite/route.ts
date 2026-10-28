import { NextResponse } from "next/server";
import { fichaContext, unauthorized, forbidden, notFound, dbError } from "@/lib/ficha/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id: patientId } = await params;

  // Verificar que el paciente pertenezca a la organización
  const { data: patient, error: patientError } = await ctx.supabase
    .from("patients")
    .select("id")
    .eq("org_id", ctx.session.orgId)
    .eq("id", patientId)
    .maybeSingle();

  if (patientError) return dbError(patientError);
  if (!patient) return notFound("Paciente no encontrado");

  const body = (await request.json().catch(() => null)) as { favorite?: boolean } | null;
  let targetFavorite: boolean;

  if (body && typeof body.favorite === "boolean") {
    targetFavorite = body.favorite;
  } else {
    const { data: existing } = await ctx.supabase
      .from("doctor_favorite_patients")
      .select("patient_id")
      .eq("doctor_id", ctx.session.id)
      .eq("patient_id", patientId)
      .maybeSingle();

    targetFavorite = !existing;
  }

  if (targetFavorite) {
    const { error: insertError } = await ctx.supabase
      .from("doctor_favorite_patients")
      .upsert(
        {
          doctor_id: ctx.session.id,
          patient_id: patientId,
        },
        { onConflict: "doctor_id,patient_id" },
      );

    if (insertError) return dbError(insertError);
  } else {
    const { error: deleteError } = await ctx.supabase
      .from("doctor_favorite_patients")
      .delete()
      .eq("doctor_id", ctx.session.id)
      .eq("patient_id", patientId);

    if (deleteError) return dbError(deleteError);
  }

  return NextResponse.json({
    patientId,
    favorite: targetFavorite,
  });
}

