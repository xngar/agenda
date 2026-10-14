import { FACE_LABEL, STATE_LABEL } from "./dental";

export const AUDIT_ACCIONES: Record<string, string> = {
  insert: "Creación",
  update: "Edición",
  delete: "Eliminación",
  sign: "Firma",
  export: "Exportación",
  view: "Lectura",
};

export const AUDIT_ENTIDADES: Record<string, string> = {
  patients: "Paciente",
  encounters: "Atención",
  encounter_versions: "Versión",
  dental_chart_entries: "Odontograma",
  dental_treatment_plan_items: "Plan",
  dental_payments: "Pago",
  prescriptions: "Receta",
  consents: "Consentimiento",
  attachments: "Adjunto",
  patient_medical_background: "Antecedentes",
};

function texto(valor: unknown, max = 120): string {
  if (valor === undefined || valor === null) return "";
  const s = String(valor).trim().replace(/\s+/g, " ");
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function fechaCorta(valor: unknown): string {
  const s = texto(valor, 10);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
}

/** Quita `privateNotes` a cualquier profundidad (snapshots incluidos). */
export function redactAuditSummary(summary: unknown): unknown {
  if (Array.isArray(summary)) return summary.map(redactAuditSummary);
  if (!summary || typeof summary !== "object") return summary;
  const copia = { ...(summary as Record<string, unknown>) };
  if ("privateNotes" in copia) delete copia.privateNotes;
  for (const key of Object.keys(copia)) {
    const v = copia[key];
    if (v && typeof v === "object") copia[key] = redactAuditSummary(v);
  }
  return copia;
}

/**
 * Detalle legible de una fila de auditoría ("Firmó la atención del
 * 2026-10-06", "Pieza 16 oclusal: caries"). Reemplaza el JSON crudo.
 */
export function detalleAuditoria(entry: {
  action: string;
  entity: string;
  summary?: unknown;
}): string {
  const s = (entry.summary ?? {}) as Record<string, unknown>;
  const { action, entity } = entry;

  if (entity === "encounters") {
    if (action === "sign") {
      const motivo = texto(s.motivo, 80);
      return `Firmó la atención del ${fechaCorta(s.started_at)}${motivo ? ` · ${motivo}` : ""}`;
    }
    if (action === "insert") {
      const motivo = texto(s.motivo, 80);
      return `Registró atención del ${fechaCorta(s.started_at)}${motivo ? ` · ${motivo}` : ""}`;
    }
    if (action === "delete") return "Eliminó una atención";
    return "Editó una atención";
  }

  if (entity === "encounter_versions") {
    return `Corrección: ${texto(s.reason, 100) || "sin motivo indicado"}`;
  }

  if (entity === "dental_chart_entries") {
    const cara =
      FACE_LABEL[String(s.face) as keyof typeof FACE_LABEL] ?? texto(s.face);
    const estado =
      STATE_LABEL[String(s.state) as keyof typeof STATE_LABEL] ?? texto(s.state);
    if (action === "delete") return "Eliminó un registro del odontograma";
    return `Pieza ${texto(s.tooth)} · ${cara}: ${estado}`.trim();
  }

  if (entity === "dental_treatment_plan_items") {
    const que = texto(s.description, 60) || `Pieza ${texto(s.tooth)}`;
    if (action === "insert") return `Agregó al plan: ${que}`;
    if (action === "delete") return "Quitó un ítem del plan";
    return `Plan: ${que}${s.status ? ` → ${texto(s.status)}` : ""}`;
  }

  if (entity === "dental_payments") {
    if (action === "delete") return "Anuló un pago";
    return `Registró pago de $${Number(s.amount ?? 0).toLocaleString("es-CL")}`;
  }

  if (entity === "prescriptions") {
    if (action === "delete") return "Eliminó una receta";
    return `Receta: ${texto(s.medication, 60)}${texto(s.dose) ? ` · ${texto(s.dose, 40)}` : ""}`;
  }

  if (entity === "consents") {
    const tipo =
      s.kind === "datos_personales"
        ? "datos personales"
        : s.kind === "tratamiento_dental"
          ? "tratamiento dental"
          : s.kind === "psicoterapia"
            ? "psicoterapia"
            : s.kind === "atencion_online"
              ? "atención online"
              : texto(s.kind);
    return `Consentimiento informado: ${tipo}`;
  }

  if (entity === "attachments") {
    if (action === "delete") return "Eliminó un adjunto";
    return `Adjunto: ${texto(s.file_name, 60) || texto(s.description, 60) || "documento"}`;
  }

  if (entity === "patient_medical_background") {
    return "Actualizó los antecedentes de salud";
  }

  if (entity === "patients") {
    if (action === "insert") return `Creó la ficha de ${texto(s.full_name, 60)}`;
    if (action === "delete") return "Eliminó la ficha";
    return "Actualizó los datos de la ficha";
  }

  return "";
}
