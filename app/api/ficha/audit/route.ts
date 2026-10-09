import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
} from "@/lib/ficha/http";
import { auditQuerySchema } from "@/lib/ficha/schemas";

const ACCIONES: Record<string, string> = {
  insert: "Creación",
  update: "Edición",
  delete: "Eliminación",
  sign: "Firma",
  export: "Exportación",
  view: "Lectura",
};

const ENTIDADES: Record<string, string> = {
  patients: "Paciente",
  encounters: "Atención",
  encounter_versions: "Versión",
  dental_chart_entries: "Odontograma",
  dental_treatment_plan_items: "Plan",
  prescriptions: "Receta",
  consents: "Consentimiento",
  attachments: "Adjunto",
  patient_medical_background: "Antecedentes",
};

const enc = (s: string): string => `"${s.replace(/"/g, '""')}"`;

export async function GET(request: Request) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.session.isAdmin && !ctx.session.isSuperAdmin) return forbidden("Sólo el administrador ve la auditoría");

  const { searchParams } = new URL(request.url);
  const body = auditQuerySchema.safeParse({
    entity: searchParams.get("entity") ?? undefined,
    entity_id: searchParams.get("entity_id") ?? undefined,
    limit: searchParams.get("limit") ?? 50,
  });
  if (!body.success) return bodyError(body.error);

  const format = searchParams.get("format");
  if (format !== null && format !== "json" && format !== "csv") {
    return bodyError({ issues: [{ message: "Formato no soportado" }] });
  }
  const download = format !== null;

  let query = ctx.supabase
    .from("audit_log")
    .select("*")
    .eq("org_id", ctx.session.orgId)
    .order("created_at", { ascending: false })
    .limit(body.data.limit);

  if (body.data.entity) query = query.eq("entity", body.data.entity);
  if (body.data.entity_id) query = query.eq("entity_id", body.data.entity_id);

  const { data, error } = await query;
  if (error) return dbError(error);

  const entries = data ?? [];

  if (download) {
    try {
      await ctx.supabase.rpc("audit_export_event", {
        p_entity: body.data.entity ?? (body.data.entity_id ? "patients" : "audit_log"),
        p_entity_id: body.data.entity_id ?? null,
        p_summary: { format, registros: entries.length },
      });
    } catch {
      // La descarga no se bloquea si no se pudo registrar el evento.
    }
  }

  if (format === "csv") {
    const headers = ["fecha", "accion", "entidad", "entidad_id", "detalle", "actor"];
    const rows = entries.map((e) =>
      [
        e.created_at,
        ACCIONES[e.action] ?? e.action,
        ENTIDADES[e.entity] ?? e.entity,
        e.entity_id ?? "",
        JSON.stringify(e.summary ?? {}),
        e.actor_id ?? "",
      ]
        .map((c) => enc(String(c)))
        .join(";"),
    );
    const csv = [headers.join(";"), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="auditoria-${body.data.entity_id ?? "general"}.csv"`,
      },
    });
  }

  return NextResponse.json(
    { entries },
    {
      headers: download
        ? { "Content-Disposition": `attachment; filename="auditoria-${body.data.entity_id ?? "general"}.json"` }
        : undefined,
    },
  );
}