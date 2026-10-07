import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buttonClasses } from "@/components/ui";
import { OrganizationList, type OrganizationRow } from "./org-list";

export default async function PlataformaOrganizacionesPage() {
  await requireSuperAdmin();
  const supabase = supabaseAdmin();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id,name,slug,active")
    .order("name");

  const rows = (orgs ?? []) as OrganizationRow[];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
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