import { NextResponse } from "next/server";
import { z } from "zod";
import { getDoctorSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidRut } from "@/lib/rut";

// ---------------------------------------------------------------------------
// Normalización de valores de enums
// ---------------------------------------------------------------------------

const SEX_MAP: Record<string, string> = {
  m: "male", masculino: "male", hombre: "male",
  f: "female", femenino: "female", mujer: "female",
  o: "other", otro: "other",
};

const PREVISION_MAP: Record<string, string> = {
  fonasa: "fonasa",
  isapre: "isapre",
  particular: "particular", privado: "particular",
  otro: "other", other: "other",
};

const MARITAL_MAP: Record<string, string> = {
  soltero: "single", soltera: "single", single: "single",
  casado: "married", casada: "married", married: "married",
  viudo: "widowed", viuda: "widowed", widowed: "widowed",
  divorciado: "divorced", divorciada: "divorced", divorced: "divorced",
  otro: "other", other: "other",
};

const FONASA_MAP: Record<string, string> = {
  a: "A", b: "B", c: "C", d: "D",
};

function norm(map: Record<string, string>, v: string | undefined): string | undefined {
  if (!v) return undefined;
  return map[v.toLowerCase().trim()] ?? undefined;
}

// ---------------------------------------------------------------------------
// Parser CSV auto-detecta separador: ; , o \t
// ---------------------------------------------------------------------------

function detectSeparator(firstLine: string): string {
  const counts = {
    ";": (firstLine.match(/;/g) ?? []).length,
    ",": (firstLine.match(/,/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const bom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = bom.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const sep = detectSeparator(lines[0]);
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Validación por fila
// ---------------------------------------------------------------------------

const REQUIRED_HEADERS = ["rut", "nombres", "apellido_paterno"];

const dateOpt = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido, usa YYYY-MM-DD")
  .optional()
  .or(z.literal(""))
  .transform((v) => v || undefined);

const textOpt = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || undefined);

const rowSchema = z.object({
  rut: z
    .string()
    .trim()
    .min(1, "El RUT es obligatorio")
    .refine((v) => isValidRut(v), "RUT inválido (dígito verificador incorrecto)"),
  nombres: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  apellido_paterno: z.string().trim().min(1, "El apellido paterno es obligatorio").max(60),
  apellido_materno: textOpt(60),
  fecha_nacimiento: dateOpt,
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")).transform((v) => v || undefined),
  telefono: textOpt(40),
  sexo: textOpt(20),
  direccion: textOpt(200),
  comuna: textOpt(80),
  region: textOpt(80),
  prevision: textOpt(30),
  fonasa_tramo: textOpt(1),
  isapre_nombre: textOpt(120),
  isapre_plan: textOpt(120),
  nacionalidad: textOpt(80),
  estado_civil: textOpt(30),
  ocupacion: textOpt(120),
  contacto_emergencia_nombre: textOpt(120),
  contacto_emergencia_parentesco: textOpt(60),
  contacto_emergencia_telefono: textOpt(40),
  tutor_nombre: textOpt(120),
  tutor_rut: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidRut(v), "RUT del tutor inválido")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  tutor_parentesco: textOpt(60),
  tutor_telefono: textOpt(40),
  como_llego: textOpt(200),
  fecha_ingreso: dateOpt,
  notas: textOpt(1000),
});

// ---------------------------------------------------------------------------
// Guard: solo super-admin de plataforma
// ---------------------------------------------------------------------------

async function requirePlatformAdmin(supabase: ReturnType<typeof supabaseAdmin>, doctorId: string) {
  const { data } = await supabase.from("doctors").select("is_super_admin").eq("id", doctorId).maybeSingle();
  return Boolean(data?.is_super_admin);
}

// ---------------------------------------------------------------------------
// POST /api/platform/organizations/[id]/import
// ---------------------------------------------------------------------------

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getDoctorSession();
  if (!session) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });

  const supabase = supabaseAdmin();
  if (!(await requirePlatformAdmin(supabase, session.id))) {
    return NextResponse.json({ error: "Solo el equipo de la plataforma puede importar datos" }, { status: 403 });
  }

  const { id: orgId } = await params;

  const { data: org } = await supabase.from("organizations").select("id,name").eq("id", orgId).maybeSingle();
  if (!org) return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el formulario" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Falta el archivo CSV" }, { status: 422 });
  }

  const text = await (file as File).text();
  const { headers, rows } = parseCSV(text);

  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return NextResponse.json(
      {
        error: `El archivo no tiene las columnas requeridas: ${missingHeaders.join(", ")}`,
        code: "missing_headers",
      },
      { status: 422 },
    );
  }

  if (rows.length === 0) return NextResponse.json({ error: "El archivo no tiene filas de datos" }, { status: 422 });
  if (rows.length > 2000) return NextResponse.json({ error: "Máximo 2.000 pacientes por archivo" }, { status: 422 });

  const errors: { fila: number; campo: string; mensaje: string }[] = [];
  const valid: Record<string, unknown>[] = [];
  const rutsVistos = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const fila = i + 2;
    const raw = rows[i];
    const parsed = rowSchema.safeParse(raw);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({ fila, campo: issue.path.join(".") || "?", mensaje: issue.message });
      }
      continue;
    }

    const d = parsed.data;

    if (rutsVistos.has(d.rut)) {
      errors.push({ fila, campo: "rut", mensaje: `RUT duplicado en el archivo (${d.rut})` });
      continue;
    }
    rutsVistos.add(d.rut);

    const sexNorm = norm(SEX_MAP, d.sexo);
    if (d.sexo && !sexNorm) {
      errors.push({ fila, campo: "sexo", mensaje: `"${d.sexo}" no válido. Usa: Masculino, Femenino u Otro` });
      continue;
    }

    const prevNorm = norm(PREVISION_MAP, d.prevision);
    if (d.prevision && !prevNorm) {
      errors.push({ fila, campo: "prevision", mensaje: `"${d.prevision}" no válido. Usa: Fonasa, Isapre, Particular u Otro` });
      continue;
    }

    const maritalNorm = norm(MARITAL_MAP, d.estado_civil);
    if (d.estado_civil && !maritalNorm) {
      errors.push({ fila, campo: "estado_civil", mensaje: `"${d.estado_civil}" no válido. Usa: Soltero, Casado, Viudo, Divorciado u Otro` });
      continue;
    }

    const fonasaNorm = norm(FONASA_MAP, d.fonasa_tramo);
    if (d.fonasa_tramo && !fonasaNorm) {
      errors.push({ fila, campo: "fonasa_tramo", mensaje: `"${d.fonasa_tramo}" no válido. Usa: A, B, C o D` });
      continue;
    }

    const fullName = [d.nombres, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(" ").trim();

    valid.push({
      full_name: fullName,
      nombres: d.nombres,
      apellido_paterno: d.apellido_paterno,
      apellido_materno: d.apellido_materno ?? null,
      rut: d.rut,
      birth_date: d.fecha_nacimiento ?? null,
      email: d.email ?? "",
      phone: d.telefono ?? null,
      sex: sexNorm ?? null,
      address: d.direccion ?? null,
      comuna: d.comuna ?? null,
      region: d.region ?? null,
      prevision_type: prevNorm ?? null,
      fonasa_tramo: fonasaNorm ?? null,
      isapre_name: d.isapre_nombre ?? null,
      isapre_plan: d.isapre_plan ?? null,
      nationality: d.nacionalidad ?? null,
      marital_status: maritalNorm ?? null,
      occupation: d.ocupacion ?? null,
      emergency_name: d.contacto_emergencia_nombre ?? null,
      emergency_relation: d.contacto_emergencia_parentesco ?? null,
      emergency_phone: d.contacto_emergencia_telefono ?? null,
      tutor_name: d.tutor_nombre ?? null,
      tutor_rut: d.tutor_rut ?? null,
      tutor_relation: d.tutor_parentesco ?? null,
      tutor_phone: d.tutor_telefono ?? null,
      referral_source: d.como_llego ?? null,
      admitted_at: d.fecha_ingreso ?? null,
      org_id: orgId,
      patient_status: "active",
      consent_at: new Date().toISOString(),
    });
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  // Verificar duplicados en BD
  const { data: existentes } = await supabase
    .from("patients")
    .select("rut")
    .eq("org_id", orgId)
    .in("rut", valid.map((p) => p.rut as string));

  const rutsExistentes = new Set((existentes ?? []).map((p) => p.rut as string));
  const nuevos = valid.filter((p) => !rutsExistentes.has(p.rut as string));
  const duplicados = valid.length - nuevos.length;

  if (nuevos.length === 0) {
    return NextResponse.json(
      { ok: false, errors: [{ fila: 0, campo: "rut", mensaje: "Todos los RUTs ya existen en esta organización" }] },
      { status: 422 },
    );
  }

  // Inserción en batches de 200
  const BATCH = 200;
  let insertados = 0;

  for (let i = 0; i < nuevos.length; i += BATCH) {
    const chunk = nuevos.slice(i, i + BATCH);
    const { error: insertError } = await supabase.from("patients").insert(chunk);
    if (insertError) {
      return NextResponse.json(
        { error: `Error al insertar pacientes (batch ${Math.floor(i / BATCH) + 1}): ${insertError.message}` },
        { status: 500 },
      );
    }
    insertados += chunk.length;
  }

  await supabase.from("audit_log").insert({
    org_id: orgId,
    actor_id: session.id,
    action: "import",
    entity: "patients",
    entity_id: orgId,
    summary: { insertados, duplicados_omitidos: duplicados, total_archivo: valid.length },
  });

  return NextResponse.json({ ok: true, insertados, duplicados_omitidos: duplicados });
}
