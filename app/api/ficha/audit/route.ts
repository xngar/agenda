import { NextResponse } from "next/server";
import {
  fichaContext,
  unauthorized,
  forbidden,
  bodyError,
  dbError,
  type FichaContext,
} from "@/lib/ficha/http";
import { auditQuerySchema } from "@/lib/ficha/schemas";
import {
  AUDIT_ACCIONES,
  AUDIT_ENTIDADES,
  detalleAuditoria,
  redactAuditSummary,
} from "@/lib/ficha/audit-view";

const enc = (s: string): string =>
  `"${s.replace(/"/g, '""')}"`;

/** Tablas de ficha que cuelgan de un paciente (para el filtro patient_id). */
const TABLAS_PACIENTE = [
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
];

type Fila = Record<string, unknown>;

export async function GET(request: Request) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { searchParams } = new URL(request.url);
  const body = auditQuerySchema.safeParse({
    entity: searchParams.get("entity") ?? undefined,
    entity_id: searchParams.get("entity_id") ?? undefined,
    patient_id: searchParams.get("patient_id") ?? undefined,
    limit: searchParams.get("limit") ?? 50,
  });
  if (!body.success) return bodyError(body.error);

  const format = searchParams.get("format");
  if (format !== null && format !== "json" && format !== "csv") {
    return bodyError({ issues: [{ message: "Formato no soportado" }] });
  }
  const download = format !== null;

  // El dueño del paciente también ve su historial, no sólo el admin.
  if (body.data.patient_id) {
    const { data: dueno, error: duenoError } = await ctx.supabase
      .from("patients")
      .select("id,doctor_id")
      .eq("org_id", ctx.session.orgId)
      .eq("id", body.data.patient_id)
      .maybeSingle();
    if (duenoError) return dbError(duenoError);
    if (!dueno) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }
    if (!ctx.session.isAdmin && !ctx.session.isSuperAdmin && dueno.doctor_id !== ctx.session.id) {
      return forbidden("Sólo el administrador o el profesional tratante ve la auditoría");
    }
  } else if (!ctx.session.isAdmin && !ctx.session.isSuperAdmin) {
    return forbidden("Sólo el administrador ve la auditoría");
  }

  let rows: Fila[];
  if (body.data.patient_id) {
    try {
      rows = await eventosDePaciente(ctx, body.data.patient_id as string, body.data.limit);
    } catch (error) {
      return dbError(error as { message?: string; code?: string });
    }
  } else {
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
    rows = (data ?? []) as unknown as Fila[];
  }

  const entries = await conAutores(ctx, rows);

  if (download) {
    try {
      await ctx.supabase.rpc("audit_export_event", {
        p_entity: body.data.entity ?? (body.data.entity_id ? "patients" : "audit_log"),
        p_entity_id: body.data.entity_id ?? body.data.patient_id ?? null,
        p_summary: { format, registros: entries.length },
      });
    } catch {
      // La descarga no se bloquea si no se pudo registrar el evento.
    }
  }

  if (format === "csv") {
    const headers = ["fecha", "autor", "accion", "entidad", "detalle"];
    const filas = entries.map((e) =>
      [
        new Date(String(e.created_at)).toLocaleString("es-CL"),
        String(e.actor_name ?? ""),
        AUDIT_ACCIONES[String(e.action)] ?? String(e.action),
        AUDIT_ENTIDADES[String(e.entity)] ?? String(e.entity),
        String(e.detalle ?? ""),
      ]
        .map((c) => enc(c))
        .join(";"),
    );
    const csv = [headers.join(";"), ...filas].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="auditoria-${body.data.entity_id ?? body.data.patient_id ?? "general"}.csv"`,
      },
    });
  }

  return NextResponse.json(
    { entries },
    {
      headers: download
        ? { "Content-Disposition": `attachment; filename="auditoria-${body.data.entity_id ?? body.data.patient_id ?? "general"}.json"` }
        : undefined,
    },
  );
}

/**
 * Eventos de un paciente en todas sus entidades. El `entity_id` de cada
 * fila es el id de SU propia tabla (no el del paciente), así que se
 * resuelven los ids por tabla y se traen juntos.
 */
async function eventosDePaciente(
  ctx: FichaContext,
  patientId: string,
  limit: number,
): Promise<Fila[]> {
  const condiciones = [
    `and(entity.eq.patients,entity_id.eq.${patientId})`,
  ];

  for (const tabla of TABLAS_PACIENTE) {
    const { data, error } = await ctx.supabase
      .from(tabla)
      .select("id")
      .eq("org_id", ctx.session.orgId)
      .eq("patient_id", patientId);
    if (error || !data || data.length === 0) continue;
    const ids = (data as { id: string }[]).map((r) => r.id).join(",");
    // PostgREST no acepta in() vacío: ya se filtró arriba.
    for (const lote of partir(ids.split(","), 100)) {
      condiciones.push(`and(entity.eq.${tabla},entity_id.in.(${lote.join(",")}))`);
    }
  }

  const { data, error } = await ctx.supabase
    .from("audit_log")
    .select("*")
    .eq("org_id", ctx.session.orgId)
    .or(condiciones.join(","))
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as Fila[];
}

function partir<T>(arr: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < arr.length; i += tamano) lotes.push(arr.slice(i, i + tamano));
  return lotes;
}

/** Agrega nombre del autor y detalle curado, con notas privadas redactadas. */
async function conAutores(
  ctx: FichaContext,
  rows: Fila[],
): Promise<(Fila & { actor_name: string | null; detalle: string })[]> {
  const ids = [...new Set(rows.map((r) => r.actor_id).filter((v) => typeof v === "string"))] as string[];
  const nombres = new Map<string, string>();
  if (ids.length > 0) {
    const { data } = await ctx.supabase
      .from("doctors")
      .select("id,full_name")
      .eq("org_id", ctx.session.orgId)
      .in("id", ids);
    for (const d of (data ?? []) as { id: string; full_name: string }[]) {
      nombres.set(d.id, d.full_name);
    }
  }

  return rows.map((r) => {
    const summary = redactAuditSummary(r.summary);
    return {
      ...r,
      summary,
      actor_name:
        typeof r.actor_id === "string" ? (nombres.get(r.actor_id) ?? null) : null,
      detalle: detalleAuditoria({
        action: String(r.action),
        entity: String(r.entity),
        summary,
      }),
    };
  });
}
