import { FACE_LABEL, STATE_LABEL } from "./dental";

export const AUDIT_ACCIONES: Record<string, string> = {
  insert: "Creación",
  update: "Edición",
  delete: "Eliminación",
  sign: "Firma",
  export: "Exportación",
  view: "Lectura",
  contact: "Contacto",
};

export const AUDIT_ENTIDADES: Record<string, string> = {
  patients: "Paciente",
  encounters: "Atención",
  encounter_versions: "Versión",
  dental_chart_entries: "Odontograma",
  periodontal_records: "Periodoncia",
  dental_treatment_plan_items: "Plan",
  dental_payments: "Pago",
  prescriptions: "Receta",
  consents: "Consentimiento",
  attachments: "Adjunto",
  patient_medical_background: "Antecedentes",
  patient_background: "Antecedentes",
  patient_export: "Exportación de ficha",
  patient_pdf: "Ficha en PDF",
  audit_log: "Auditoría",
  appointments: "Cita",
};

/**
 * Tablas de ficha que cuelgan de un paciente. Su `entity_id` en audit_log es
 * el id de la propia fila, no el del paciente, así que la auditoría por
 * paciente resuelve esos ids para armarlos en el filtro.
 */
export const AUDIT_TABLAS_PACIENTE = [
  "encounters",
  "encounter_versions",
  "attachments",
  "consents",
  "prescriptions",
  "dental_chart_entries",
  "dental_treatment_plan_items",
  "dental_payments",
  "periodontal_records",
  "patient_medical_background",
] as const;

/** Entidades que puede mostrar la auditoría de un paciente. */
export const AUDIT_ENTIDADES_PACIENTE: readonly string[] = [
  "patients",
  ...AUDIT_TABLAS_PACIENTE,
  "patient_background",
  "patient_pdf",
  "patient_export",
  "appointments",
];

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

const CAMPO_LABEL: Record<string, string> = {
  full_name: "nombre",
  rut: "RUT",
  birth_date: "fecha de nacimiento",
  sex: "sexo",
  phone: "teléfono",
  email: "correo",
  address: "dirección",
  occupation: "ocupación",
  emergency_contact_name: "contacto de emergencia",
  emergency_contact_phone: "teléfono de emergencia",
  doctor_id: "profesional tratante",
  specialty_profile: "datos de especialidad",
  motivo_consulta: "motivo de consulta",
  antecedentes_medicos: "antecedentes médicos",
  medicamentos: "medicamentos",
  alergias: "alergias",
  antecedentes_familiares: "antecedentes familiares",
  habitos: "hábitos",
  embarazo_lactancia: "embarazo/lactancia",
  started_at: "fecha de atención",
  care_type: "tipo de atención",
  motivo: "motivo",
  evolucion: "evolución",
  diagnostico: "diagnóstico",
  indicaciones: "indicaciones",
  proxima_cita_at: "próxima cita",
  specialty_data: "ficha de especialidad",
  status: "estado",
  signed_by: "firma",
  signed_at: "fecha de firma",
  tooth: "pieza",
  face: "cara",
  state: "estado",
  description: "descripción",
  price: "precio",
  amount: "monto",
  medication: "medicamento",
  dose: "dosis",
  kind: "tipo",
  file_name: "archivo",
};

const LECTURA_ENTIDAD: Record<string, string> = {
  patients: "Consultó la ficha del paciente",
  patient_background: "Consultó los antecedentes de salud",
  patient_medical_background: "Consultó los antecedentes de salud",
  patient_pdf: "Descargó la ficha clínica en PDF",
  patient_export: "Exportó el respaldo completo de la ficha",
  encounters: "Consultó el historial de atenciones",
  encounter_versions: "Consultó las versiones de una atención",
  attachments: "Consultó los archivos adjuntos",
  consents: "Consultó los consentimientos informados",
  prescriptions: "Consultó las recetas",
  dental_chart_entries: "Consultó el odontograma",
  periodontal_records: "Consultó el periodontograma",
  dental_treatment_plan_items: "Consultó el plan de tratamiento",
  dental_payments: "Consultó los pagos del plan",
};

function resumenCamposCambiados(value: unknown): string {
  if (!Array.isArray(value)) return "";
  const etiquetas = value
    .filter((k): k is string => typeof k === "string" && k !== "updated_at" && k !== "updated_by")
    .map((k) => CAMPO_LABEL[k] ?? k.replace(/_/g, " "));
  if (etiquetas.length === 0) return "";
  const unicas = [...new Set(etiquetas)];
  if (unicas.length <= 4) return unicas.join(", ");
  return `${unicas.slice(0, 4).join(", ")} (+${unicas.length - 4})`;
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

  if (action === "view") {
    return LECTURA_ENTIDAD[entity] ?? `Consultó ${AUDIT_ENTIDADES[entity]?.toLowerCase() ?? entity}`;
  }

  if (action === "export") {
    const formato = texto(s.format, 10).toUpperCase();
    const registros = typeof s.registros === "number" ? s.registros : null;
    const sufijo = [
      formato ? `en ${formato}` : "",
      registros !== null ? `(${registros} ${registros === 1 ? "registro" : "registros"})` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `Exportó el historial de auditoría${sufijo ? ` ${sufijo}` : ""}`;
  }

  const campos = resumenCamposCambiados(s.changed_fields);

  if (entity === "encounters") {
    if (action === "sign") {
      const fecha = fechaCorta(s.started_at);
      const motivo = texto(s.motivo, 80);
      if (fecha) {
        return `Firmó la atención del ${fecha}${motivo ? ` · ${motivo}` : ""}`;
      }
      return "Firmó la atención clínica";
    }
    if (action === "insert") {
      const fecha = fechaCorta(s.started_at);
      const motivo = texto(s.motivo, 80);
      if (fecha) {
        return `Registró atención del ${fecha}${motivo ? ` · ${motivo}` : ""}`;
      }
      return "Registró una nueva atención clínica";
    }
    if (action === "delete") return "Eliminó un borrador de atención";
    return campos ? `Editó una atención (${campos})` : "Editó una atención";
  }

  if (entity === "encounter_versions") {
    if (s.reason !== undefined) {
      return `Corrección: ${texto(s.reason, 100) || "sin motivo indicado"}`;
    }
    return "Registró una corrección sobre atención firmada";
  }

  if (entity === "dental_chart_entries") {
    if (action === "delete") return "Eliminó un registro del odontograma";
    const diente = texto(s.tooth);
    if (diente) {
      const cara =
        FACE_LABEL[String(s.face) as keyof typeof FACE_LABEL] ?? texto(s.face);
      const estado =
        STATE_LABEL[String(s.state) as keyof typeof STATE_LABEL] ?? texto(s.state);
      return `Pieza ${diente} · ${cara}: ${estado}`.trim();
    }
    return action === "insert"
      ? "Registró un hallazgo en el odontograma"
      : `Actualizó el odontograma${campos ? ` (${campos})` : ""}`;
  }

  if (entity === "periodontal_records") {
    if (action === "delete") return "Eliminó un registro periodontal";
    const diente = texto(s.tooth);
    if (diente) {
      return `Periodoncia: pieza ${diente} · movilidad ${texto(s.mobility)}`.trim();
    }
    return action === "insert"
      ? "Registró mediciones en el periodontograma"
      : `Actualizó el periodontograma${campos ? ` (${campos})` : ""}`;
  }

  if (entity === "dental_treatment_plan_items") {
    if (action === "delete") return "Quitó un ítem del plan";
    const que = texto(s.description, 60) || (texto(s.tooth) ? `Pieza ${texto(s.tooth)}` : "");
    if (que) {
      if (action === "insert") return `Agregó al plan: ${que}`;
      return `Plan: ${que}${s.status ? ` → ${texto(s.status)}` : ""}`;
    }
    if (action === "insert") return "Agregó una prestación al plan de tratamiento";
    return `Actualizó un ítem del plan${campos ? ` (${campos})` : ""}`;
  }

  if (entity === "dental_payments") {
    if (action === "delete") return "Anuló un pago";
    if (s.amount !== undefined && s.amount !== null) {
      return `Registró pago de $${Number(s.amount).toLocaleString("es-CL")}`;
    }
    return "Registró un abono al plan de tratamiento";
  }

  if (entity === "prescriptions") {
    if (action === "delete") return "Eliminó una receta";
    const med = texto(s.medication, 60);
    if (med) {
      return `Receta: ${med}${texto(s.dose) ? ` · ${texto(s.dose, 40)}` : ""}`;
    }
    return action === "insert" ? "Emitió una receta médica" : `Actualizó una receta${campos ? ` (${campos})` : ""}`;
  }

  if (entity === "consents") {
    if (action === "delete") return "Eliminó un consentimiento informado";
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
    return tipo ? `Consentimiento informado: ${tipo}` : "Registró un consentimiento informado";
  }

  if (entity === "attachments") {
    if (action === "delete") return "Eliminó un adjunto";
    const nombre = texto(s.file_name, 60) || texto(s.description, 60);
    if (nombre) return `Adjunto: ${nombre}`;
    return action === "insert" ? "Subió un archivo adjunto" : `Actualizó un adjunto${campos ? ` (${campos})` : ""}`;
  }

  if (entity === "patient_medical_background" || entity === "patient_background") {
    return campos
      ? `Actualizó los antecedentes de salud (${campos})`
      : "Actualizó los antecedentes de salud";
  }

  if (entity === "patients") {
    if (action === "contact") {
      return s.channel === "whatsapp"
        ? "Inició contacto por WhatsApp"
        : "Inició contacto con el paciente";
    }
    if (action === "insert") {
      const nombre = texto(s.full_name, 60);
      return nombre ? `Creó la ficha de ${nombre}` : "Creó la ficha del paciente";
    }
    if (action === "delete") return "Eliminó la ficha";
    return campos
      ? `Actualizó los datos de la ficha (${campos})`
      : "Actualizó los datos de la ficha";
  }

  /**
   * Citas: el resumen viene del trigger `audit_appointment_change`, con hora
   * local de la clínica. La hora movida es la información que un admin necesita
   * para reconstruir un reclamo, así que va primero cuando existe.
   */
  if (entity === "appointments") {
    if (action === "delete") return "Eliminó una cita";

    const desde = texto(s.desde, 16);
    const hasta = texto(s.hasta, 16);
    const motivo = texto(s.motivo, 80);

    if (s.movio_hora === true) {
      return `Movió la cita del ${desde} al ${hasta}${motivo ? ` · ${motivo}` : ""}`;
    }
    if (texto(s.evento) === "cambio_profesional") {
      return `Cambió el profesional de la cita${motivo ? ` · ${motivo}` : ""}`;
    }

    const estado = texto(s.estado_hasta, 24);
    const etiqueta = ESTADO_CITA[estado] ?? (estado ? `estado ${estado}` : "la cita");
    return `${etiqueta}${desde ? ` · cita del ${desde}` : ""}${motivo ? ` · ${motivo}` : ""}`;
  }

  return "";
}

const ESTADO_CITA: Record<string, string> = {
  pending: "Dejó pendiente la cita",
  confirmed: "Confirmó la cita",
  cancelled: "Canceló la cita",
  completed: "Completó la cita",
  no_show: "Marcó que el paciente no asistió",
};
