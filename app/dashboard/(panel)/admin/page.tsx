import "server-only";

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { TeamList } from "./team-list";

export const dynamic = "force-dynamic";

/**
 * Vista de administración: estado del equipo.
 *
 * `requireAdmin()` lee `is_admin` desde la base en cada render, así que
 * quitarle el rol a alguien surte efecto en su próxima navegación sin
 * depender de que expire ningún cookie.
 *
 * Activar y desactivar ocurre en `TeamList`, un componente de cliente que
 * llama a `PATCH /api/dashboard/doctors`. Esa ruta comprueba la sesión otra
 * vez y devuelve un mensaje legible; RLS lo autorizaba igual, pero el error
 * sin traducir no le sirve de nada a quien administra.
 */
export default async function AdminPage() {
  const session = await requireAdmin();
  const supabase = await supabaseServer();

  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, full_name, specialty, is_admin, active")
    .order("full_name");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Equipo</h1>
        <p className="text-sm text-neutral-600">
          Profesionales con acceso al panel. Sólo un administrador puede activar o desactivar
          cuentas.
        </p>
      </div>

      <TeamList initial={doctors ?? []} selfId={session.id} />

      <p className="text-sm text-neutral-500">
        <Link className="underline underline-offset-4 hover:text-brand-navy" href="/dashboard">
          Volver a la agenda
        </Link>
      </p>
    </div>
  );
}