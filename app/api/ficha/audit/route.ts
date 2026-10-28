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
  AUDIT_TABLAS_PACIENTE,
  detalleAuditoria,
  redactAuditSummary,
} from "@/lib/ficha/audit-view";

const enc = (s: string): string =>
  `"${s.replace(/"/g, '""')}"`;

/** Filas por lote al exportar: evita el tope de `max-rows` de PostgREST. */
const LOTE_EXPORT = 1000;

type Fila = Record<string, unknown>;

interface Filtros {
  patientId?: string;
  entity?: string;
  entityId?: string;
  action?: string;
}

export async function GET(request: Request) {
  const ctx = await fichaContext();
  if (!ctx) return unauthorized();
  if (!ctx.clinical) return forbidden();

  const { searchParams } = new URL(request.url);
  const body = auditQuerySchema.safeParse({
    entity: searchParams.get("entity") ?? undefined,
    entity_id: searchParams.get("entity_id") ?? undefined,
    patient_id: searchParams.get("patient_id") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    limit: searchParams.get("limit") ?? 50,
    offset: searchParams.get("offset") ?? undefined,
  });
  if (!body.success) return bodyError(body.error);

  const format = searchParams.get("format");
  if (format !== null && format !== "json" && format !== "csv") {
    return bodyError({ issues: [{ message: "Formato no soportado" }] });
  }
  const download = format !== null;

  // El dueño del paciente también ve su historial, no sólo el admin.
  let nombreArchivo = "general";
  if (body.data.patient_id) {
    const { data: dueno, error: duenoError } = await ctx.supabase
      .from("patients")
      .select("id,doctor_id,full_name")
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
    nombreArchivo = slugNombre((dueno.full_name as string | null) ?? "paciente");
  } else if (!ctx.session.isAdmin && !ctx.session.isSuperAdmin) {
    return forbidden("Sólo el administrador ve la auditoría");
  }

  const filtros: Filtros = {
    patientId: body.data.patient_id,
    entity: body.data.entity,
    entityId: body.data.entity_id,
    action: body.data.action,
  };

  let rows: Fila[];
  let total: number;
  try {
    if (download) {
      rows = await traerTodo(ctx, filtros);
      total = rows.length;
    } else {
      const pagina = await traerPagina(ctx, filtros, body.data.offset, body.data.limit);
      rows = pagina.rows;
      total = pagina.total;
    }
  } catch (error) {
    return dbError(error as { message?: string; code?: string });
  }

  const entries = await conAutores(ctx, rows);

  if (download) {
    try {
      const { error } = await ctx.supabase.rpc("audit_export_event", {
        p_entity: body.data.entity ?? (body.data.entity_id ? "patients" : "audit_log"),
        p_entity_id: body.data.entity_id ?? body.data.patient_id ?? null,
        p_summary: { format, registros: entries.length },
      });
      if (error) {
        return NextResponse.json(
          { error: "No se pudo registrar la exportación; la descarga fue bloqueada." },
          { status: 503 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "No se pudo registrar la exportación; la descarga fue bloqueada." },
        { status: 503 },
      );
    }
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const nombreBase = `auditoria-${nombreArchivo}-${hoy}`;

  if (format === "csv") {
    const headers = ["fecha", "autor", "accion", "entidad", "detalle"];
    const filas = entries.map((e) =>
      [
        new Date(String(e.created_at)).toLocaleString("es-CL", {
          timeZone: "America/Santiago",
        }),
        String(e.actor_name ?? "—"),
        AUDIT_ACCIONES[String(e.action)] ?? String(e.action),
        AUDIT_ENTIDADES[String(e.entity)] ?? String(e.entity),
        String(e.detalle ?? ""),
      ]
        .map((c) => enc(c))
        .join(";"),
    );
    // BOM para que Excel en Windows abra los tildes sin mojibake.
    const csv = "\uFEFF" + [headers.join(";"), ...filas].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombreBase}.csv"`,
      },
    });
  }

  if (download) {
    // En descargas no va el snapshot crudo: sólo lo curado.
    const limpio = entries.map((e) => {
      const copia = { ...(e as Fila) };
      delete copia.summary;
      return copia;
    });
    return NextResponse.json(
      { entries: limpio },
      {
        headers: { "Content-Disposition": `attachment; filename="${nombreBase}.json"` },
      },
    );
  }

  return NextResponse.json({ entries, total });
}

/** "Mauricio Auditoría" -> "mauricio-auditoria" para el nombre de archivo. */
function slugNombre(nombre: string): string {
  const slug = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "paciente";
}

/** Página pedida por la vista (limit + offset) con el total de coincidencias. */
async function traerPagina(
  ctx: FichaContext,
  filtros: Filtros,
  offset: number,
  limit: number,
): Promise<{ rows: Fila[]; total: number }> {
  const condiciones = filtros.patientId
    ? await condicionesPaciente(ctx, filtros.patientId)
    : null;

  const { data, error, count } = await consultaAuditoria(ctx, filtros, condiciones, true)
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { rows: (data ?? []) as unknown as Fila[], total: count ?? 0 };
}

/**
 * Exportación completa. PostgREST recorta cada respuesta a `max-rows`, así que
 * se pagina en lotes hasta agotar las coincidencias: el export no lleva tope.
 */
async function traerTodo(ctx: FichaContext, filtros: Filtros): Promise<Fila[]> {
  const condiciones = filtros.patientId
    ? await condicionesPaciente(ctx, filtros.patientId)
    : null;

  const rows: Fila[] = [];
  for (let desde = 0; ; desde += LOTE_EXPORT) {
    const { data, error } = await consultaAuditoria(ctx, filtros, condiciones).range(
      desde,
      desde + LOTE_EXPORT - 1,
    );
    if (error) throw error;
    const lote = (data ?? []) as unknown as Fila[];
    rows.push(...lote);
    if (lote.length < LOTE_EXPORT) break;
  }
  return rows;
}

function consultaAuditoria(
  ctx: FichaContext,
  filtros: Filtros,
  condiciones: string[] | null,
  contar = false,
) {
  let query = ctx.supabase
    .from("audit_log")
    .select("*", contar ? { count: "exact" } : {})
    .eq("org_id", ctx.session.orgId);

  if (condiciones) query = query.or(condiciones.join(","));
  if (filtros.entity) query = query.eq("entity", filtros.entity);
  // En modo paciente el entity_id es el de cada tabla, no el del paciente.
  if (filtros.entityId && !condiciones) query = query.eq("entity_id", filtros.entityId);
  if (filtros.action) query = query.eq("action", filtros.action);

  return query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
}

/**
 * Eventos de un paciente en todas sus entidades. El `entity_id` de cada
 * fila es el id de SU propia tabla (no el del paciente), así que se
 * resuelven los ids por tabla y se traen juntos.
 */
async function condicionesPaciente(
  ctx: FichaContext,
  patientId: string,
): Promise<string[]> {
  const condiciones = [`and(entity.eq.patients,entity_id.eq.${patientId})`];

  for (const tabla of AUDIT_TABLAS_PACIENTE) {
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

  return condiciones;
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
  for (const lote of partir(ids, 200)) {
    const { data } = await ctx.supabase
      .from("doctors")
      .select("id,full_name")
      .eq("org_id", ctx.session.orgId)
      .in("id", lote);
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
