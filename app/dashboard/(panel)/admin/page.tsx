import "server-only";

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { AddMemberForm } from "./add-member-form";
import { TeamList } from "./team-list";

export const dynamic = "force-dynamic";

/**
 * Vista de administración: equipo de la clínica.
 *
 * `requireAdmin()` lee `is_admin` desde la base en cada render, así que
 * quitarle el rol a alguien surte efecto en su próxima navegación sin
 * depender de que expire ningún cookie.
 *
 * El alta ocurre en `AddMemberForm` (POST /api/dashboard/doctors) y activar
 * o desactivar en `TeamList` (PATCH de la misma ruta). Ambas rutas
 * comprueban la sesión otra vez y devuelven un mensaje legible; RLS lo
 * autoriza igual, pero el error sin traducir no le sirve de nada a quien
 * administra.
 */
export default async function AdminPage() {
  const session = await requireAdmin();
  const supabase = await supabaseServer();

  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, full_name, specialty, role, is_admin, active")
    .order("full_name");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Equipo</h1>
        <p className="text-sm text-neutral-600">
          Profesionales con acceso al panel. Un administrador puede agregar miembros y
          activar o desactivar cuentas.
        </p>
      </div>

      <AddMemberForm />

      <TeamList initial={doctors ?? []} selfId={session.id} />

      <p className="text-sm text-neutral-500">
        <Link className="underline underline-offset-4 hover:text-brand-navy" href="/dashboard">
          Volver a la agenda
        </Link>
      </p>
    </div>
  );
}