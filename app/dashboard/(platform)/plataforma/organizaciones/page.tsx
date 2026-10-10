import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buttonClasses } from "@/components/ui";
import { OrganizationList, type OrganizationRow } from "./org-list";

function fechaCreacion(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

export default async function PlataformaOrganizacionesPage() {
  await requireSuperAdmin();
  const supabase = supabaseAdmin();

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id,name,slug,active,created_at,professional_limit")
    .order("name");

  let rows: OrganizationRow[] = (orgs ?? []).map((org) => ({
    id: org.id,
    name: org.name ?? "",
    slug: org.slug ?? "",
    active: org.active,
    createdAt: fechaCreacion(org.created_at),
    admin: null,
    professionals: 0,
    professionalLimit: org.professional_limit as number | null,
  }));

  if (orgs?.length) {
    const orgIds = orgs.map((org) => org.id as string);

    const { data: doctores } = await supabase
      .from("doctors")
      .select("id, full_name, org_id, is_admin, active, role")
      .in("org_id", orgIds);

    const porOrg = new Map<
      string,
      { admins: { id: string; name: string; active: boolean }[]; total: number; totalProfessionals: number }
    >();
    for (const d of doctores ?? []) {
      const entry = porOrg.get(d.org_id) ?? { admins: [], total: 0, totalProfessionals: 0 };
      entry.total += 1;
      if (d.role === "professional") entry.totalProfessionals += 1;
      if (d.is_admin) entry.admins.push({ id: d.id, name: d.full_name, active: d.active });
      porOrg.set(d.org_id, entry);
    }

    const adminIds = [...new Set([...porOrg.values()].flatMap((e) => e.admins.map((a) => a.id)))];
    const emails = new Map<string, string>();
    await Promise.all(
      adminIds.map(async (id) => {
        const { data: usuario } = await supabase.auth.admin.getUserById(id);
        emails.set(id, usuario?.user?.email ?? "");
      }),
    );

    rows = orgs.map((org) => {
      const id = org.id as string;
      const entry = porOrg.get(id);
      const mainAdmin = entry?.admins.find((a) => a.active) ?? entry?.admins[0];
      return {
        id,
        name: org.name ?? "",
        slug: org.slug ?? "",
        active: org.active,
        createdAt: fechaCreacion(org.created_at),
        admin: mainAdmin
          ? { id: mainAdmin.id, name: mainAdmin.name, email: emails.get(mainAdmin.id) ?? "" }
          : null,
        professionals: entry?.totalProfessionals ?? 0,
        professionalLimit: org.professional_limit ?? 2,
      };
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-brand-navy">Organizaciones</h1>
        <Link
          href="/dashboard/plataforma/organizaciones/nueva"
          className={buttonClasses("primary", "sm")}
        >
          Crear nueva
        </Link>
      </div>

      <OrganizationList organizations={rows} />
    </div>
  );
}