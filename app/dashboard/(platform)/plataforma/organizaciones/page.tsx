import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Card, buttonClasses } from "@/components/ui";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export default async function PlataformaOrganizacionesPage() {
  await requireSuperAdmin();
  const supabase = supabaseAdmin();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id,name,slug,active")
    .order("name");

  const rows = (orgs ?? []) as OrgRow[];

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

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-600">Todavía no hay organizaciones.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((org) => (
            <Card as="li" key={org.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="min-w-0">
                <span className="block font-semibold text-neutral-800">{org.name}</span>
                <span className="block text-sm text-neutral-500">/{org.slug}</span>
              </span>
              <span
                className={
                  org.active
                    ? "rounded-full bg-brand-sky-100 px-2.5 py-0.5 text-xs font-semibold text-brand-navy"
                    : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600"
                }
              >
                {org.active ? "Activa" : "Inactiva"}
              </span>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}