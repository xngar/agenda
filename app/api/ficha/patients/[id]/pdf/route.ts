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
import { FACE_LABEL, STATE_LABEL } from "@/lib/ficha/dental";

type Params = { params: Promise<{ id: string }> };

const SEXOS: Record<string, string> = {
  female: "Mujer",
  male: "Hombre",
  other: "Otro",
  undisclosed: "No informado",
};

const CIVIL: Record<string, string> = {
  single: "Soltero/a",
  married: "Casado/a",
  widowed: "Viudo/a",
  divorced: "Divorciado/a",
  other: "Otro",
};

const PREVISION: Record<string, string> = {
  fonasa: "Fonasa",
  isapre: "Isapre",
  particular: "Particular",
  other: "Otro",
};

const PACIENTE_ESTADO: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  abandoned: "Abandonado",
};

const ATENCION_ESTADO: Record<string, string> = {
  signed: "Firmada",
  draft: "Borrador",
};

const PLAN_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  en_curso: "En curso",
  realizado: "Realizado",
  rechazado: "Rechazado",
};

const CONSENT_TIPO: Record<string, string> = {
  datos_personales: "Datos personales",
  tratamiento_dental: "Tratamiento dental",
  psicoterapia: "Psicoterapia",
  atencion_online: "Atención online",
  other: "Otro",
};

const ADJUNTO_TIPO: Record<string, string> = {
  document: "Documento",
  radiografia: "Radiografía",
  foto_intraoral: "Foto intraoral",
  foto_extraoral: "Foto extraoral",
  modelo: "Modelo",
  consentimiento: "Consentimiento",
  informe: "Informe",
  other: "Otro",
};

const text = (value: unknown): string => String(value ?? "");
const fecha = (value: unknown): string => text(value).slice(0, 10);
const etiqueta = (mapa: Record<string, string>, value: unknown): string =>
  mapa[String(value)] ?? text(value);

/** Ordena una sublista con el mismo criterio que las rutas del panel. */
function ordenar(
  rows: Record<string, unknown>[],
  campo: string,
  desc = true,
): Record<string, unknown>[] {
  return [...rows].sort((a, b) => {
    const va = a[campo] == null ? "" : String(a[campo]);
    const vb = b[campo] == null ? "" : String(b[campo]);
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return desc ? -cmp : cmp;
  });
}

async function buildPdf(patient: Record<string, unknown>, ctx: { orgName: string }): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<void>((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);
  });

  const field = (labelText: string, value: unknown) => {
    const show = text(value) || "—";
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#444").text(`${labelText}: `, { continued: true });
    doc.font("Helvetica").fillColor("#111").text(show);
  };

  const section = (title: string) => {
    const bottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y > bottom - 110) doc.addPage();
    doc.moveDown(0.4);
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#111").text(title);
    doc.moveDown(0.2);
  };

  doc.font("Helvetica-Bold").fontSize(16).text("Ficha clínica", { align: "left" });
  doc.font("Helvetica").fontSize(10).fillColor("#666")
    .text(`${ctx.orgName} · ${fecha(patient.created_at)}`, { continued: false });
  doc.moveDown(0.6);

  section("Datos personales");
  field("Paciente", patient.full_name);
  field("RUT", patient.rut);
  field("Teléfono", patient.phone);
  field("Correo", patient.email);
  field("Fecha de nacimiento", fecha(patient.birth_date));
  field("Sexo", etiqueta(SEXOS, patient.sex));
  field("Nacionalidad", patient.nationality);
  field("Estado civil", etiqueta(CIVIL, patient.marital_status));
  field("Ocupación", patient.occupation);
  field("Dirección", [patient.address, patient.comuna].filter(Boolean).join(", "));
  if (patient.prevision_type === "isapre") {
    field(
      "Previsión",
      [etiqueta(PREVISION, patient.prevision_type), patient.isapre_name]
        .filter(Boolean)
        .join(" · ") + (patient.isapre_plan ? ` (${text(patient.isapre_plan)})` : ""),
    );
  } else if (patient.prevision_type === "fonasa") {
    field(
      "Previsión",
      patient.fonasa_tramo
        ? `${etiqueta(PREVISION, patient.prevision_type)} · Tramo ${text(patient.fonasa_tramo)}`
        : etiqueta(PREVISION, patient.prevision_type),
    );
  } else {
    field("Previsión", etiqueta(PREVISION, patient.prevision_type));
  }

  section("Registro");
  field("Paciente desde", fecha(patient.admitted_at));
  field("Cómo llegó", patient.referral_source);
  field("Consentimiento", fecha(patient.consent_at));
  field("Estado", etiqueta(PACIENTE_ESTADO, patient.patient_status));

  section("Contacto de emergencia");
  field("Contacto", [patient.emergency_name, patient.emergency_relation ? `(${text(patient.emergency_relation)})` : ""].filter(Boolean).join(" "));
  field("Teléfono", patient.emergency_phone);

  section("Apoderado o tutor");
  field("Apoderado/a", [patient.tutor_name, patient.tutor_relation ? `(${text(patient.tutor_relation)})` : ""].filter(Boolean).join(" "));
  field("RUT apoderado", patient.tutor_rut);
  field("Teléfono apoderado", patient.tutor_phone);

  const background = patient.patient_medical_background as Record<string, unknown> | null;
  if (background) {
    section("Antecedentes de salud");
    field("Motivo de consulta", background.motivo_consulta);
    field("Antecedentes médicos", background.antecedentes_medicos);
    field("Antecedentes familiares", background.antecedentes_familiares);
  }

  const encounters = ordenar(
    (patient.encounters as Record<string, unknown>[] | null) ?? [],
    "started_at",
  );
  section(`Atenciones (${encounters.length})`);
  for (const encounter of encounters) {
    field("Fecha", fecha(encounter.started_at));
    if (encounter.care_type) field("Tipo de atención", encounter.care_type);
    field("Motivo", encounter.motivo);
    field("Evolución", encounter.evolucion);
    field("Diagnóstico", encounter.diagnostico);
    field("Indicaciones", encounter.indicaciones);
    field(
      "Estado",
      etiqueta(ATENCION_ESTADO, encounter.status) +
        (encounter.status === "signed" && encounter.signed_at ? ` · ${fecha(encounter.signed_at)}` : ""),
    );
    doc.moveDown(0.3);
  }

  const chart = ((patient.dental_chart_entries as Record<string, unknown>[] | null) ?? [])
    .filter((c) => c.current !== false)
    .sort(
      (a, b) =>
        Number(a.tooth) - Number(b.tooth) || String(a.face).localeCompare(String(b.face)),
    );
  if (chart.length) {
    section("Odontograma actual");
    const porDiente = new Map<number, string[]>();
    for (const c of chart) {
      const tooth = Number(c.tooth);
      const cara = FACE_LABEL[String(c.face) as keyof typeof FACE_LABEL] ?? text(c.face);
      const estado = STATE_LABEL[String(c.state)] ?? text(c.state);
      porDiente.set(tooth, [...(porDiente.get(tooth) ?? []), `${cara}: ${estado}`]);
    }
    for (const [tooth, caras] of [...porDiente.entries()].sort((a, b) => a[0] - b[0])) {
      doc.font("Helvetica").fontSize(10).fillColor("#111")
        .text(`Pieza ${tooth}: ${caras.join(" · ")}`);
    }
  }

  const periodontal = ordenar(
    (patient.periodontal_records as Record<string, unknown>[] | null) ?? [],
    "recorded_at",
  );
  if (periodontal.length) {
    section(`Registro periodontal (${periodontal.length})`);
    for (const p of periodontal) {
      field("Fecha", fecha(p.recorded_at));
      field("Diente", p.tooth);
      field("Movilidad", p.mobility);
      field("Diagnóstico", p.diagnosis);
      doc.moveDown(0.3);
    }
  }

  const plan = ordenar((patient.dental_treatment_plan_items as Record<string, unknown>[] | null) ?? [], "priority", false);
  if (plan.length) {
    section(`Plan de tratamiento (${plan.length})`);
    for (const item of plan) {
      field(
        "Ítem",
        [text(item.tooth), text(item.description), etiqueta(PLAN_ESTADO, item.status)].filter(Boolean).join(" · "),
      );
    }
  }

  const prescriptions = ordenar(
    (patient.prescriptions as Record<string, unknown>[] | null) ?? [],
    "created_at",
  );
  if (prescriptions.length) {
    section(`Recetas (${prescriptions.length})`);
    for (const p of prescriptions) {
      field("Medicamento", [text(p.medication), text(p.dose), text(p.frequency)].filter(Boolean).join(" · "));
    }
  }

  const consents = ordenar((patient.consents as Record<string, unknown>[] | null) ?? [], "accepted_at");
  if (consents.length) {
    section(`Consentimientos (${consents.length})`);
    for (const c of consents) {
      field(
        "Tipo",
        [etiqueta(CONSENT_TIPO, c.kind), text(c.version)].filter(Boolean).join(" · ") +
          (c.accepted_at ? ` · ${fecha(c.accepted_at)}` : ""),
      );
    }
  }

  const attachments = ordenar(
    (patient.attachments as Record<string, unknown>[] | null) ?? [],
    "created_at",
  );
  if (attachments.length) {
    section(`Adjuntos (${attachments.length})`);
    for (const a of attachments) {
      field(
        "Adjunto",
        [etiqueta(ADJUNTO_TIPO, a.kind), text(a.file_name), fecha(a.taken_at ?? a.created_at)]
          .filter(Boolean)
          .join(" · "),
      );
    }
  }

  const rango = doc.bufferedPageRange();
  const total = rango.count;
  for (let i = rango.start; i < rango.start + total; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor("#999")
      .text(`Ficha clínica · Página ${i + 1} de ${total}`, 48, doc.page.height - 36, {
        width: doc.page.width - 96,
        align: "center",
      });
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
      "*, patient_medical_background (*), encounters (*), dental_chart_entries (*), dental_treatment_plan_items (*), consents (*), prescriptions (*), periodontal_records (*), attachments (*)",
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