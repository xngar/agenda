export const runtime = "nodejs";

import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  notFound,
  dbError,
} from "@/lib/ficha/http";

type Params = { params: Promise<{ id: string }> };

async function buildPdf(patient: Record<string, unknown>, ctx: { orgName: string }): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<void>((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);
  });

  const text = (value: unknown): string => String(value ?? "");

  doc.font("Helvetica-Bold").fontSize(16).text("Ficha clínica", { align: "left" });
  doc.font("Helvetica").fontSize(10).fillColor("#666")
    .text(`${ctx.orgName} · ${text(patient.created_at).slice(0, 10)}`, { continued: false });
  doc.moveDown(0.6);

  const section = (title: string) => {
    doc.moveDown(0.4);
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#111").text(title);
    doc.moveDown(0.2);
  };

  const field = (label: string, value: unknown) => {
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#444").text(`${label}: `, { continued: true });
    doc.font("Helvetica").fillColor("#111").text(text(value));
  };

  section("Datos personales");
  field("Paciente", patient.full_name);
  field("RUT", patient.rut);
  field("Fecha de nacimiento", patient.birth_date);
  field("Sexo", patient.sex);
  field("Ocupación", patient.occupation);
  field("Comuna", patient.comuna);
  field("Previsión", patient.prevision_type);

  const background = patient.patient_medical_background as Record<string, unknown> | null;
  if (background) {
    section("Antecedentes de salud");
    field("Motivo de consulta", background.motivo_consulta);
    field("Antecedentes médicos", background.antecedentes_medicos);
    field("Antecedentes familiares", background.antecedentes_familiares);
  }

  const encounters = (patient.encounters as Record<string, unknown>[] | null) ?? [];
  section(`Atenciones (${encounters.length})`);
  for (const encounter of encounters.slice(0, 20)) {
    field("Fecha", text(encounter.started_at).slice(0, 10));
    field("Motivo", encounter.motivo);
    field("Evolución", encounter.evolucion);
    field("Diagnóstico", encounter.diagnostico);
    field("Indicaciones", encounter.indicaciones);
    doc.moveDown(0.3);
  }

  const chart = (patient.dental_chart_entries as Record<string, unknown>[] | null) ?? [];
  if (chart.length) {
    section("Odontograma actual");
    doc.font("Helvetica").fontSize(10).fillColor("#111")
      .text(chart.map((c) => `${text(c.tooth)} ${text(c.face)}: ${text(c.state)}`).join(" · "));
  }

  const plan = (patient.dental_treatment_plan_items as Record<string, unknown>[] | null) ?? [];
  if (plan.length) {
    section("Plan de tratamiento");
    for (const item of plan) {
      field("Ítem", `${text(item.tooth)} ${text(item.description)} · ${text(item.status)}`);
    }
  }

  const prescriptions = (patient.prescriptions as Record<string, unknown>[] | null) ?? [];
  if (prescriptions.length) {
    section("Recetas");
    for (const p of prescriptions) {
      field("Medicamento", `${text(p.medication)} · ${text(p.dose)} ${text(p.frequency)}`);
    }
  }

  const consents = (patient.consents as Record<string, unknown>[] | null) ?? [];
  if (consents.length) {
    section(`Consentimientos (${consents.length})`);
    for (const c of consents) {
      field("Tipo", `${text(c.kind)} · ${text(c.version)}`);
    }
  }

  doc.end();
  await done;
  return Buffer.concat(chunks);
}

export async function GET(_request: Request, { params }: Params) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { id } = await params;
  const { data: org } = await ctx.supabase.from("organizations").select("name").eq("id", ctx.session.orgId).single();

  const { data: patient, error } = await ctx.supabase
    .from("patients")
    .select(
      "*, patient_medical_background (*), encounters (*), dental_chart_entries (*), dental_treatment_plan_items (*), consents (*), prescriptions (*)",
    )
    .eq("org_id", ctx.session.orgId)
    .eq("id", id)
    .maybeSingle();

  if (error) return dbError(error);
  if (!patient) return notFound("Paciente no encontrado");

  const pdf = await buildPdf(patient, { orgName: org?.name ?? "Clínica" });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ficha-${textSafe(id)}.pdf"`,
    },
  });
}

function textSafe(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, "");
}