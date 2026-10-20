import "server-only";

import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AddMemberButton } from "./add-member-form";
import { TeamList } from "./team-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";
import { AnimatedNumber } from "@/components/motion/animated-number";

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

  // El email no está en `doctors`, vive en la cuenta de acceso (auth.users).
  const emailPorId = new Map<string, string>();
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    for (const user of data.users) {
      if (user.email) emailPorId.set(user.id, user.email);
    }
    if (data.users.length < 1000) break;
  }

  const team = (doctors ?? []).map((d) => ({
    id: String(d.id),
    full_name: String(d.full_name),
    specialty: (d.specialty as string | null) ?? null,
    role: d.role as "professional" | "reception",
    is_admin: Boolean(d.is_admin),
    active: Boolean(d.active),
    email: emailPorId.get(String(d.id)) ?? null,
  }));

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
            <AnimatedNumber value={used} className="font-semibold tabular-nums text-neutral-800" />
            <span className="tabular-nums">de {limit === null ? "∞" : limit}</span>
            {limit !== null && used >= limit ? (
              <span className="text-warning-700">· Cupo alcanzado</span>
            ) : null}
          </span>
        }
      />

      <TeamList initial={team} selfId={session.id} />

      <BackLink />
    </div>
  );
}