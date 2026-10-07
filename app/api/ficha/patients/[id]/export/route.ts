import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  dbError,
} from "@/lib/ficha/http";

type Params = { params: Promise<{ id: string }> };

const enc = (s: string): string =>
  `"${s.replace(/"/g, '""')}"`;

export async function GET(request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "json";

  const { data: patient, error } = await ctx.supabase
    .from("patients")
    .select(
      "*, patient_medical_background (*), encounters (*), dental_chart_entries (*), periodontal_records (*), dental_treatment_plan_items (*), consents (*), prescriptions (*), attachments (*)",
    )
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();

  if (error) return dbError(error);
  if (!patient) return notFound("Paciente no encontrado");

  if (format === "json") {
    return NextResponse.json({ patient });
  }

  const rows = [
    {
      paciente: patient.full_name,
      rut: patient.rut ?? "",
      email: patient.email ?? "",
      telefono: patient.phone ?? "",
      sexo: patient.sex ?? "",
      nacimiento: patient.birth_date ?? "",
      comuna: patient.comuna ?? "",
      prevision: patient.prevision_type ?? "",
      estado: patient.patient_status,
      atenciones: (patient.encounters as unknown[] | null)?.length ?? 0,
      recetas: (patient.prescriptions as unknown[] | null)?.length ?? 0,
      adjuntos: (patient.attachments as unknown[] | null)?.length ?? 0,
      creado: patient.created_at,
    },
  ];

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(";"),
    ...rows.map((row) => headers.map((h) => enc(String(row[h as keyof typeof row] ?? ""))).join(";")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paciente-${id}.csv"`,
    },
  });
}