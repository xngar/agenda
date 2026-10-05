/**
 * Seed de desarrollo: crea los profesionales y sus horarios.
 *
 * Por qué NO importa `lib/supabase/admin.ts`: ese módulo hace
 * `import "server-only"`, que lanza al evaluarse fuera de React Server
 * Components. Este script corre con tsx, así que arma su propio cliente.
 * La validación de entorno sí se reusa desde `lib/env.ts` (no importa
 * server-only y no depende de Next).
 *
 * Idempotente: se puede correr las veces que haga falta. Si el correo ya
 * existe en Auth, reutiliza el usuario en vez de fallar.
 *
 *   npm run seed:dev
 */

import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

loadEnvConfig(process.cwd(), true);

const SEED_PASSWORD = process.env.SEED_DOCTOR_PASSWORD ?? "AgendaDev2026!";

/**
 * Reglas de disponibilidad. `weekday` sigue la convención de Postgres
 * (`extract(dow)`): 0 = domingo ... 6 = sábado. El domingo no tiene regla
 * porque el motor de disponibilidad lo rechaza igual; dejarlo vacío es
 * más explícito que confiar en ese rechazo.
 */
const WEEKDAY_RULES: { weekday: number; windows: [string, string][] }[] = [
  // Lunes a viernes: mañana y tarde.
  { weekday: 1, windows: [["09:00", "13:00"], ["15:00", "19:00"]] },
  { weekday: 2, windows: [["09:00", "13:00"], ["15:00", "19:00"]] },
  { weekday: 3, windows: [["09:00", "13:00"], ["15:00", "19:00"]] },
  { weekday: 4, windows: [["09:00", "13:00"], ["15:00", "19:00"]] },
  { weekday: 5, windows: [["09:00", "13:00"], ["15:00", "19:00"]] },
  // Sábado: sólo mañana.
  { weekday: 6, windows: [["09:00", "13:00"]] },
];

interface SeedDoctor {
  email: string;
  fullName: string;
  specialty: string;
  isAdmin: boolean;
}

const DOCTORS: SeedDoctor[] = [
  {
    email: "camila.rojas@clinicadental.test",
    fullName: "Dra. Camila Rojas",
    specialty: "Odontología general",
    isAdmin: true,
  },
  {
    email: "sebastian.munoz@clinicadental.test",
    fullName: "Dr. Sebastián Muñoz",
    specialty: "Endodoncia",
    isAdmin: false,
  },
];

async function main(): Promise<void> {
  const env = serverEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`→ Conectado a ${env.NEXT_PUBLIC_SUPABASE_URL}`);

  const { data: services } = await supabase.from("services").select("id, name").eq("active", true);
  if (!services?.length) {
    console.error("✗ No hay servicios activos. Corre la migración 0006 (seed) primero.");
    process.exitCode = 1;
    return;
  }

  for (const doctor of DOCTORS) {
    await upsertDoctor(supabase, doctor);
  }

  console.log("\n✓ Seed de desarrollo completo.");
  console.log(`  Contraseña de ambos: ${SEED_PASSWORD}`);
  console.log(`  Admin: ${DOCTORS[0]!.email}`);
  console.log(`  Profesional: ${DOCTORS[1]!.email}`);
}

async function upsertDoctor(supabase: SupabaseClient, doctor: SeedDoctor): Promise<void> {
  const userId = await ensureAuthUser(supabase, doctor.email);

  const { error: doctorError } = await supabase
    .from("doctors")
    .upsert(
      {
        id: userId,
        full_name: doctor.fullName,
        specialty: doctor.specialty,
        is_admin: doctor.isAdmin,
        active: true,
      },
      { onConflict: "id" },
    );

  if (doctorError) throw new Error(`doctors/${doctor.email}: ${doctorError.message}`);
  console.log(`  · ${doctor.fullName} (${doctor.email})`);

  // Reemplazamos las reglas completas para que el seed sea idempotente:
  // si se cambia el horario en este archivo, no quedan ventanas viejas.
  const { error: deleteError } = await supabase
    .from("availability_rules")
    .delete()
    .eq("doctor_id", userId);
  if (deleteError) throw new Error(`borrar reglas: ${deleteError.message}`);

  const rows = WEEKDAY_RULES.flatMap((rule) =>
    rule.windows.map(([startTime, endTime]) => ({
      doctor_id: userId,
      weekday: rule.weekday,
      start_time: startTime,
      end_time: endTime,
    })),
  );

  const { error: insertError } = await supabase.from("availability_rules").insert(rows);
  if (insertError) throw new Error(`insertar reglas: ${insertError.message}`);

  console.log(`    ${rows.length} ventanas de horario`);
}

async function ensureAuthUser(supabase: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
  });

  if (!error && data.user) return data.user.id;

  // Sin error pero sin usuario es un estado inconsistente: mejor fallar
  // que devolver un id inventado.
  if (!error) throw new Error(`auth/${email}: Auth no devolvió usuario ni error`);

  // "already registered" es el caso normal al re-correr el seed.
  const alreadyExists = /already|registered|exists/i.test(error.message);
  if (!alreadyExists) throw new Error(`auth/${email}: ${error.message}`);

  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw new Error(`listar usuarios: ${listError.message}`);

  const found = list.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (!found) throw new Error(`El usuario ${email} existe pero no se pudo leer`);

  // El password puede haber cambiado desde el panel de Supabase, así que
  // lo restablecemos para que el login local sea predecible.
  await supabase.auth.admin.updateUserById(found.id, {
    password: SEED_PASSWORD,
    email_confirm: true,
  });

  return found.id;
}

main().catch((error: unknown) => {
  console.error("✗ Seed falló:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
