/**
 * Migración asistida de clínicas (flujo manual, con service_role).
 *
 * La clínica exporta lo que su sistema le permita y nos manda los archivos;
 * nosotros normalizamos al CSV canónico (ver plantilla/README.md) y este
 * script valida, importa, verifica y revierte por corrida.
 *
 *   tsx scripts/migrate-clinic/run.ts --org=<slug> --dir=<carpeta> --cmd=dry-run|import|verify|rollback [--run=<id>]
 *
 * - dry-run: valida todo y muestra el informe. No escribe nada.
 * - import: crea usuarios/doctores/servicios/pacientes/citas y guarda el
 *   mapa en runs/<slug>-<timestamp>/map.json para reintento y rollback.
 * - verify: re-cuenta lo del mapa contra la BD.
 * - rollback: borra citas y fichas creadas por la corrida (doctores y
 *   usuarios Auth se conservan: se informa el paso manual).
 *
 * No toca diseño ni migraciones: la trazabilidad vive en map.json.
 */

import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { generateManageToken, hashManageToken } from "@/lib/token";
import { isValidRut } from "@/lib/rut";
import { parseCsv, checkHeaders } from "./csv";
import {
  ESTADO,
  citaRow,
  esAdmin,
  estadoDb,
  pacienteRow,
  profesionalRow,
  rutLimpio,
  servicioRow,
  telefonoLimpio,
  type RowIssue,
} from "./schemas";

loadEnvConfig(process.cwd(), true);

const FILES = {
  profesionales: ["nombre", "email", "especialidad", "admin", "id_externo"],
  servicios: ["nombre", "duracion_min", "id_externo"],
  pacientes: ["nombre", "rut", "telefono", "email", "fecha_nacimiento", "sexo", "profesional", "id_externo"],
  citas: ["profesional", "paciente", "servicio", "inicio", "estado", "motivo", "motivo_cancelacion"],
} as const;

type FileKey = keyof typeof FILES;

interface RunMap {
  runId: string;
  orgSlug: string;
  orgId: string;
  createdAt: string;
  doctors: { key: string; id: string; email: string; created: boolean; tempPassword?: string }[];
  services: { key: string; id: string; created: boolean }[];
  patients: { key: string; id: string; created: boolean }[];
  appointments: { key: string; id: string }[];
}

function args(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]!] = m[2]!;
  }
  return out;
}

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function readTable(dir: string, file: FileKey) {
  const raw = fs.readFileSync(path.join(dir, `${file}.csv`), "utf8");
  const table = parseCsv(raw);
  const headerError = checkHeaders(table.headers, [...FILES[file]]);
  if (headerError) fail(`${file}.csv: ${headerError}`);
  return table.rows;
}

function validateAll<T>(file: string, rows: { line: number; values: Record<string, string> }[], schema: z.ZodType<T>) {
  const ok: { line: number; data: T }[] = [];
  const issues: RowIssue[] = [];
  for (const r of rows) {
    const parsed = schema.safeParse(r.values);
    if (!parsed.success) {
      issues.push({ file, line: r.line, message: parsed.error.issues[0]?.message ?? "fila inválida" });
    } else {
      ok.push({ line: r.line, data: parsed.data });
    }
  }
  return { ok, issues };
}

function client(): SupabaseClient {
  const env = serverEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function rangeLiteral(startIso: string, endIso: string): string {
  return `[${startIso},${endIso})`;
}

/* ------------------------------------------------------------------ */
/* dry-run                                                              */
/* ------------------------------------------------------------------ */

async function dryRun(supabase: SupabaseClient, orgSlug: string, dir: string) {
  const issues: RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const push = (file: string, line: number, message: string) => issues.push({ file, line, message });
  const warn = (file: string, line: number, message: string) => warnings.push({ file, line, message });

  const { data: org } = await supabase.from("organizations").select("id, active").eq("slug", orgSlug).maybeSingle();
  if (!org) fail(`organización '${orgSlug}' no existe: créala primero desde la plataforma`);
  const orgId = org.id as string;

  const profs = validateAll("profesionales.csv", readTable(dir, "profesionales"), profesionalRow);
  const servs = validateAll("servicios.csv", readTable(dir, "servicios"), servicioRow);
  const pacs = validateAll("pacientes.csv", readTable(dir, "pacientes"), pacienteRow);
  const citas = validateAll("citas.csv", readTable(dir, "citas"), citaRow);
  issues.push(...profs.issues, ...servs.issues, ...pacs.issues, ...citas.issues);

  const seen = new Set<string>();
  const dup = (scope: string, key: string, file: string, line: number) => {
    const k = `${scope}:${key.toLowerCase()}`;
    if (seen.has(k)) push(file, line, `duplicado en archivo: ${key}`);
    else seen.add(k);
  };
  for (const r of profs.ok) dup("prof-email", r.data.email, "profesionales.csv", r.line);
  for (const r of servs.ok) dup("serv-nombre", r.data.nombre, "servicios.csv", r.line);

  const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailToUser = new Map((authList?.users ?? []).map((u) => [u.email?.toLowerCase() ?? "", u.id]));
  const { data: orgDoctors } = await supabase.from("doctors").select("id").eq("org_id", orgId);
  const orgDoctorIds = new Set((orgDoctors ?? []).map((d) => d.id as string));
  const emailToDoctor = new Map<string, string>();
  for (const [email, uid] of emailToUser) {
    if (orgDoctorIds.has(uid)) emailToDoctor.set(email, uid);
  }
  const profExt = new Map<string, string>(
    profs.ok
      .map((r): [string, string] => [(r.data.id_externo || "").toLowerCase(), r.data.email.toLowerCase()])
      .filter(([k]) => k),
  );
  const resolveDoctor = (ref: string): string | null => {
    const v = ref.trim().toLowerCase();
    if (v.includes("@")) return emailToDoctor.get(v) ?? null;
    const email = profExt.get(v);
    return email ? (emailToDoctor.get(email) ?? "archivo") : null;
  };

  const { data: orgServices } = await supabase
    .from("services")
    .select("id, name")
    .eq("org_id", orgId)
    .eq("active", true);
  const serviceByName = new Map<string, string>(
    (orgServices ?? []).map((s): [string, string] => [(s.name as string).toLowerCase(), s.id as string]),
  );
  for (const r of servs.ok) {
    if (serviceByName.has(r.data.nombre.toLowerCase())) {
      warn("servicios.csv", r.line, `el servicio '${r.data.nombre}' ya existe: se reutiliza`);
    }
  }
  const servExt = new Map(servs.ok.map((r) => [r.data.nombre.toLowerCase(), r.data.nombre]));

  const { data: orgPatients } = await supabase.from("patients").select("id, email, rut").eq("org_id", orgId);
  const patEmail = new Map<string, string>();
  const patRut = new Map<string, string>();
  for (const p of orgPatients ?? []) {
    if (p.email) patEmail.set(String(p.email).toLowerCase(), p.id as string);
    if (p.rut) patRut.set(String(p.rut).toUpperCase(), p.id as string);
  }
  for (const r of pacs.ok) {
    const email = (r.data.email || "").toLowerCase();
    const rut = rutLimpio(r.data.rut || "");
    if (r.data.rut && !isValidRut(r.data.rut)) push("pacientes.csv", r.line, `RUT inválido: ${r.data.rut}`);
    if (!email && !rut) warn("pacientes.csv", r.line, "sin email ni RUT: queda marcada para revisión de duplicados");
    if (email && patEmail.has(email)) warn("pacientes.csv", r.line, `email ya existe en la clínica: se reutiliza la ficha`);
    else if (rut && patRut.has(rut.toUpperCase())) warn("pacientes.csv", r.line, `RUT ya existe en la clínica: se reutiliza la ficha`);
    dup("pac-email", email || `__sinemail__${r.line}`, "pacientes.csv", r.line);
    if (rut) dup("pac-rut", rut, "pacientes.csv", r.line);
    if (r.data.profesional && !resolveDoctor(r.data.profesional)) {
      push("pacientes.csv", r.line, `profesional desconocido: ${r.data.profesional}`);
    }
  }
  const pacExt = new Map<string, number>(
    pacs.ok
      .map((r): [string, number] => [(r.data.id_externo || "").toLowerCase(), r.line])
      .filter(([k]) => k),
  );
  const resolvePatient = (ref: string): "archivo" | "bd" | null => {
    const v = ref.trim();
    const vl = v.toLowerCase();
    if (v.includes("@")) {
      if (patEmail.has(vl)) return "bd";
      return pacs.ok.some((r) => (r.data.email || "").toLowerCase() === vl) ? "archivo" : null;
    }
    const rut = rutLimpio(v);
    if (rut && (patRut.has(rut.toUpperCase()) || pacs.ok.some((r) => rutLimpio(r.data.rut || "") === rut))) return rut ? (patRut.has(rut.toUpperCase()) ? "bd" : "archivo") : null;
    if (pacExt.has(vl)) return "archivo";
    return null;
  };

  let futuras = 0;
  let pasadas = 0;
  for (const r of citas.ok) {
    if (!resolveDoctor(r.data.profesional)) push("citas.csv", r.line, `profesional desconocido: ${r.data.profesional}`);
    if (!resolvePatient(r.data.paciente)) push("citas.csv", r.line, `paciente desconocido: ${r.data.paciente}`);
    if (r.data.servicio && !servExt.has(r.data.servicio.toLowerCase()) && ![...serviceByName.keys()].includes(r.data.servicio.toLowerCase())) {
      push("citas.csv", r.line, `servicio desconocido: ${r.data.servicio}`);
    }
    if (!r.data.servicio) warn("citas.csv", r.line, "sin servicio: duración asumida 30 min");
    const start = fromZonedTime(r.data.inicio.replace(" ", "T") + ":00", "America/Santiago");
    if (start.getTime() > Date.now()) futuras++;
    else pasadas++;
  }

  console.log(`\nInforme dry-run · org '${orgSlug}'`);
  console.log(`  profesionales: ${profs.ok.length} · servicios: ${servs.ok.length} · pacientes: ${pacs.ok.length} · citas: ${citas.ok.length} (futuras ${futuras}, pasadas ${pasadas})`);
  console.log(`  errores: ${issues.length} · advertencias: ${warnings.length}`);
  for (const i of issues) console.log(`  ✗ ${i.file}:${i.line} ${i.message}`);
  for (const w of warnings) console.log(`  ! ${w.file}:${w.line} ${w.message}`);
  console.log(issues.length === 0 ? "\n✓ Listo para importar." : "\nCorrige los errores y repite el dry-run.");
  if (issues.length > 0) process.exitCode = 1;
}

/* ------------------------------------------------------------------ */
/* import                                                               */
/* ------------------------------------------------------------------ */

async function importRun(supabase: SupabaseClient, orgSlug: string, dir: string) {
  const { data: org } = await supabase.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
  if (!org) fail(`organización '${orgSlug}' no existe: créala primero desde la plataforma`);
  const orgId = org.id as string;
  const now = new Date().toISOString();
  const runId = `${orgSlug}-${now.slice(0, 10)}-${now.slice(11, 13)}${now.slice(14, 16)}`;
  const runDir = path.join(dir, "..", "runs", runId);
  fs.mkdirSync(runDir, { recursive: true });
  const map: RunMap = { runId, orgSlug, orgId, createdAt: now, doctors: [], services: [], patients: [], appointments: [] };
  const save = () => fs.writeFileSync(path.join(runDir, "map.json"), JSON.stringify(map, null, 2));

  const profs = validateAll("profesionales.csv", readTable(dir, "profesionales"), profesionalRow);
  const servs = validateAll("servicios.csv", readTable(dir, "servicios"), servicioRow);
  const pacs = validateAll("pacientes.csv", readTable(dir, "pacientes"), pacienteRow);
  const citas = validateAll("citas.csv", readTable(dir, "citas"), citaRow);
  const bad = [...profs.issues, ...servs.issues, ...pacs.issues, ...citas.issues];
  if (bad.length > 0) {
    for (const i of bad) console.log(`  ✗ ${i.file}:${i.line} ${i.message}`);
    fail("hay filas inválidas: corre dry-run y corrige antes de importar");
  }

  const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailToUser = new Map((authList?.users ?? []).map((u) => [u.email?.toLowerCase() ?? "", u.id]));
  const doctorByEmail = new Map<string, string>();
  const doctorByExt = new Map<string, string>();
  for (const r of profs.ok) {
    const email = r.data.email.toLowerCase();
    let uid = emailToUser.get(email);
    let created = false;
    let tempPassword: string | undefined;
    if (!uid) {
      tempPassword = randomBytes(12).toString("hex");
      const { data, error } = await supabase.auth.admin.createUser({ email, password: tempPassword, email_confirm: true });
      if (error || !data.user) fail(`auth/${email}: ${error?.message ?? "sin usuario"}`);
      uid = data.user.id;
      created = true;
    }
    const { error } = await supabase.from("doctors").upsert(
      {
        id: uid,
        full_name: r.data.nombre,
        specialty: r.data.especialidad || null,
        is_admin: esAdmin(r.data.admin),
        role: "professional",
        active: true,
        org_id: orgId,
      },
      { onConflict: "id" },
    );
    if (error) fail(`doctors/${email}: ${error.message}`);
    doctorByEmail.set(email, uid);
    if (r.data.id_externo) doctorByExt.set(r.data.id_externo.toLowerCase(), uid);
    map.doctors.push({ key: r.data.id_externo || email, id: uid, email, created, tempPassword });
    console.log(`  · profesional ${r.data.nombre} (${created ? "creado" : "existía"})`);
  }

  const { data: existingServices } = await supabase.from("services").select("id, name").eq("org_id", orgId);
  const serviceByName = new Map((existingServices ?? []).map((s) => [(s.name as string).toLowerCase(), s.id as string]));
  const serviceDur = new Map<string, number>();
  for (const r of servs.ok) {
    const key = r.data.nombre.toLowerCase();
    let id = serviceByName.get(key);
    let created = false;
    if (!id) {
      const { data, error } = await supabase
        .from("services")
        .insert({ name: r.data.nombre, duration_min: r.data.duracion_min, active: true, org_id: orgId })
        .select("id")
        .single();
      if (error || !data) fail(`services/${r.data.nombre}: ${error?.message ?? "sin fila"}`);
      id = data.id as string;
      created = true;
    }
    serviceByName.set(key, id);
    map.services.push({ key: r.data.nombre, id, created });
    console.log(`  · servicio ${r.data.nombre} (${created ? "creado" : "existía"})`);
  }
  {
    const { data: durs } = await supabase
      .from("services")
      .select("id, name, duration_min")
      .in("id", map.services.map((s) => s.id));
    for (const d of durs ?? []) {
      serviceDur.set(String(d.name).toLowerCase(), (d.duration_min as number) ?? 30);
    }
  }

  const patientByEmail = new Map<string, string>();
  const patientByRut = new Map<string, string>();
  const patientByExt = new Map<string, string>();
  for (const r of pacs.ok) {
    const email = (r.data.email || "").toLowerCase();
    const rut = rutLimpio(r.data.rut || "");
    let ownerId: string | null = null;
    if (r.data.profesional) {
      const ref = r.data.profesional.trim().toLowerCase();
      ownerId = ref.includes("@") ? (doctorByEmail.get(ref) ?? null) : (doctorByExt.get(ref) ?? null);
      if (!ownerId) fail(`pacientes.csv:${r.line} profesional desconocido: ${r.data.profesional}`);
    }
    let id: string | null = null;
    let created = true;
    if (email) {
      const { data } = await supabase.from("patients").select("id").eq("org_id", orgId).ilike("email", email).maybeSingle();
      if (data) {
        id = data.id as string;
        created = false;
      }
    }
    if (!id && rut) {
      const { data } = await supabase.from("patients").select("id, rut").eq("org_id", orgId);
      const found = (data ?? []).find((p) => rutLimpio(String(p.rut ?? "")) === rut);
      if (found) {
        id = found.id as string;
        created = false;
      }
    }
    if (!id) {
      const { data, error } = await supabase
        .from("patients")
        .insert({
          org_id: orgId,
          doctor_id: ownerId,
          full_name: r.data.nombre,
          rut: rut || null,
          phone: telefonoLimpio(r.data.telefono || "") || null,
          email: email || null,
          birth_date: r.data.fecha_nacimiento || null,
          sex: r.data.sexo || null,
          patient_status: "active",
          consent_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) fail(`pacientes.csv:${r.line} ${error.message}`);
      id = data.id as string;
    }
    if (email) patientByEmail.set(email, id);
    if (rut) patientByRut.set(rut.toUpperCase(), id);
    if (r.data.id_externo) patientByExt.set(r.data.id_externo.toLowerCase(), id);
    map.patients.push({ key: r.data.id_externo || email || rut || r.data.nombre, id, created });
    console.log(`  · paciente ${r.data.nombre} (${created ? "creado" : "reutilizado"})`);
  }

  let creadas = 0;
  let omitidas = 0;
  for (const r of citas.ok) {
    const refDoc = r.data.profesional.trim().toLowerCase();
    const doctorId = refDoc.includes("@") ? doctorByEmail.get(refDoc) : doctorByExt.get(refDoc);
    if (!doctorId) fail(`citas.csv:${r.line} profesional desconocido: ${r.data.profesional}`);
    const refPac = r.data.paciente.trim();
    const refLow = refPac.toLowerCase();
    const patientId =
      patientByEmail.get(refLow) ??
      patientByRut.get(rutLimpio(refPac).toUpperCase()) ??
      patientByExt.get(refLow) ??
      null;
    if (!patientId) fail(`citas.csv:${r.line} paciente desconocido: ${r.data.paciente}`);
    let serviceId: string | null = null;
    let duration = 30;
    if (r.data.servicio) {
      const found = serviceByName.get(r.data.servicio.toLowerCase());
      if (!found) fail(`citas.csv:${r.line} servicio desconocido: ${r.data.servicio}`);
      serviceId = found;
      duration = serviceDur.get(r.data.servicio.toLowerCase()) ?? 30;
    } else {
      console.log(`  ! citas.csv:${r.line} sin servicio: duración asumida 30 min`);
    }
    const start = fromZonedTime(r.data.inicio.replace(" ", "T") + ":00", "America/Santiago");
    const end = new Date(start.getTime() + duration * 60000);
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const { data: clash } = await supabase
      .from("appointments")
      .select("id")
      .eq("doctor_id", doctorId)
      .in("status", ["pending", "confirmed"])
      .filter("during", "ov", rangeLiteral(startIso, endIso))
      .limit(1);
    if (clash && clash.length > 0) {
      console.log(`  ! citas.csv:${r.line} choca con cita existente: omitida`);
      omitidas++;
      continue;
    }
    const estado = estadoDb(r.data.estado || undefined, start.getTime() > Date.now());
    const token = generateManageToken();
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        doctor_id: doctorId,
        patient_id: patientId,
        service_id: serviceId,
        during: rangeLiteral(startIso, endIso),
        status: ESTADO[estado as keyof typeof ESTADO],
        manage_token_hash: hashManageToken(token),
        org_id: orgId,
        cancel_reason: r.data.motivo_cancelacion || null,
      })
      .select("id")
      .single();
    if (error) fail(`citas.csv:${r.line} ${error.message}`);
    const apptId = data.id as string;
    const { error: sealError } = await supabase.rpc("seal_manage_token", {
      p_appointment: apptId,
      p_token: token,
      p_key: serverEnv().MANAGE_TOKEN_KEY,
    });
    if (sealError) console.log(`  ! cita ${apptId}: no se pudo sellar token (${sealError.message})`);
    await supabase.from("notifications").insert({ doctor_id: doctorId, appointment_id: apptId, type: "new_booking", org_id: orgId });
    map.appointments.push({ key: `linea ${r.line}`, id: apptId });
    creadas++;
  }

  save();
  console.log(`\n✓ Import listo: corrida ${runId}`);
  console.log(`  doctores: ${map.doctors.length} · servicios: ${map.services.length} · pacientes: ${map.patients.length} · citas creadas: ${creadas} · omitidas: ${omitidas}`);
  console.log(`  mapa: runs/${runId}/map.json`);
  const nuevas = map.doctors.filter((d) => d.created && d.tempPassword);
  if (nuevas.length > 0) {
    console.log("  accesos nuevos (entregar y pedir cambio de clave):");
    for (const d of nuevas) console.log(`    ${d.email} / ${d.tempPassword}`);
  }
}

/* ------------------------------------------------------------------ */
/* verify + rollback                                                    */
/* ------------------------------------------------------------------ */

function loadMap(dir: string, runId: string): { runDir: string; map: RunMap } {
  const runDir = path.join(dir, "..", "runs", runId);
  const file = path.join(runDir, "map.json");
  if (!fs.existsSync(file)) fail(`corrida '${runId}' no encontrada en runs/`);
  return { runDir, map: JSON.parse(fs.readFileSync(file, "utf8")) as RunMap };
}

async function verify(supabase: SupabaseClient, dir: string, runId: string) {
  const { map } = loadMap(dir, runId);
  async function count(table: string, ids: string[]) {
    if (ids.length === 0) return 0;
    let n = 0;
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await supabase.from(table).select("id").in("id", ids.slice(i, i + 100));
      n += data?.length ?? 0;
    }
    return n;
  }
  const docs = await count("doctors", map.doctors.map((d) => d.id));
  const servs = await count("services", map.services.map((s) => s.id));
  const pacs = await count("patients", map.patients.map((p) => p.id));
  const citas = await count("appointments", map.appointments.map((a) => a.id));
  console.log(`\nVerificación ${runId} (org '${map.orgSlug}')`);
  console.log(`  doctores: ${docs}/${map.doctors.length} · servicios: ${servs}/${map.services.length}`);
  console.log(`  pacientes: ${pacs}/${map.patients.length} · citas: ${citas}/${map.appointments.length}`);
  const ok = docs === map.doctors.length && servs === map.services.length && pacs === map.patients.length && citas === map.appointments.length;
  console.log(ok ? "✓ Todo presente." : "✗ Faltan filas: revisa el mapa y la BD.");
  if (!ok) process.exitCode = 1;
}

async function rollback(supabase: SupabaseClient, dir: string, runId: string) {
  const { map } = loadMap(dir, runId);
  const apptIds = map.appointments.map((a) => a.id);
  if (apptIds.length > 0) {
    const { error } = await supabase.from("appointments").delete().in("id", apptIds);
    if (error) fail(`borrar citas: ${error.message}`);
  }
  const newPatients = map.patients.filter((p) => p.created).map((p) => p.id);
  if (newPatients.length > 0) {
    const { error } = await supabase.from("patients").delete().in("id", newPatients);
    if (error) fail(`borrar pacientes: ${error.message}`);
  }
  const newServices = map.services.filter((s) => s.created).map((s) => s.id);
  if (newServices.length > 0) {
    const { error } = await supabase.from("services").delete().in("id", newServices);
    if (error) fail(`borrar servicios: ${error.message}`);
  }
  console.log(`\n✓ Rollback ${runId}: ${apptIds.length} citas, ${newPatients.length} pacientes creados y ${newServices.length} servicios creados eliminados.`);
  console.log("  Doctores y usuarios Auth se conservan: desactívalos desde Equipo si corresponde.");
}

async function main() {
  const a = args();
  const org = a["org"];
  const dir = a["dir"];
  const cmd = a["cmd"];
  if (!org || !dir || !cmd) {
    fail("uso: tsx scripts/migrate-clinic/run.ts --org=<slug> --dir=<carpeta> --cmd=dry-run|import|verify|rollback [--run=<id>]");
  }
  const supabase = client();
  console.log(`→ ${cmd} · org '${org}' · ${dir}`);
  if (cmd === "dry-run") await dryRun(supabase, org, dir);
  else if (cmd === "import") await importRun(supabase, org, dir);
  else if (cmd === "verify") {
    if (!a["run"]) fail("verify requiere --run=<id>");
    await verify(supabase, dir, a["run"]!);
  } else if (cmd === "rollback") {
    if (!a["run"]) fail("rollback requiere --run=<id>");
    await rollback(supabase, dir, a["run"]!);
  } else fail(`comando desconocido: ${cmd}`);
}

main().catch((error: unknown) => {
  console.error("✗ Migración falló:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
