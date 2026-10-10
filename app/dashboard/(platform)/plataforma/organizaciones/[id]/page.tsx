import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RESERVED_SLUGS } from "@/lib/platform";
import { OrganizationEditForm } from "./organization-edit-form";

export default async function PlataformaOrganizacionEditarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const supabase = supabaseAdmin();

  const { data: org } = await supabase
    .from("organizations")
    .select("id,name,slug,timezone,address,phone,support_email,consent_text,active,professional_limit")
    .eq("id", id)
    .maybeSingle();

  if (!org) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href="/dashboard/plataforma/organizaciones"
        className="text-sm font-medium text-brand-sky hover:underline"
      >
        ← Organizaciones
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-brand-navy">Editar organización</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Los cambios de nombre e identificador se reflejan en la página pública y en el panel la
        próxima vez que entren.
      </p>

      <div className="mt-6">
        <OrganizationEditForm
          id={org.id}
          slugReserved={RESERVED_SLUGS.has(org.slug)}
          initial={{
            name: org.name ?? "",
            slug: org.slug ?? "",
            timezone: org.timezone ?? "America/Santiago",
            phone: org.phone ?? "",
            address: org.address ?? "",
            supportEmail: org.support_email ?? "",
            consentText: org.consent_text ?? "",
            active: org.active,
            professionalLimit: org.professional_limit ?? 2,
          }}
        />
      </div>
    </div>
  );
}