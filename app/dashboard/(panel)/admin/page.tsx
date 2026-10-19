import "server-only";

import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { AddMemberButton } from "./add-member-form";
import { TeamList } from "./team-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";

export const dynamic = "force-dynamic";

/**
 * Vista de administración: equipo de la clínica.
 *
 * `requireAdmin()` lee `is_admin` desde la base en cada render, así que
 * quitarle el rol a alguien surte efecto en su próxima navegación sin
 * depender de que expire ningún cookie.
 *
 * El alta ocurre en `AddMemberModal` (POST /api/dashboard/doctors) y activar
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

  const { data: org } = await supabase
    .from("organizations")
    .select("professional_limit")
    .eq("id", session.orgId)
    .maybeSingle();

  const limit = org?.professional_limit ?? null;
  const used = (doctors ?? []).filter((d) => d.role === "professional" && d.active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Equipo"
        description="Profesionales con acceso al panel. Un administrador puede agregar miembros y activar o desactivar cuentas."
        actions={<AddMemberButton />}
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs font-medium text-neutral-600">
            Cupo de profesionales:
            <span className="font-semibold tabular-nums text-neutral-800">{used}</span>
            <span className="tabular-nums">de {limit === null ? "∞" : limit}</span>
            {limit !== null && used >= limit ? (
              <span className="text-warning-700">· Cupo alcanzado</span>
            ) : null}
          </span>
        }
      />

      <TeamList initial={doctors ?? []} selfId={session.id} />

      <BackLink />
    </div>
  );
}