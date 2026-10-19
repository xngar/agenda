import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RESERVED_SLUGS } from "@/lib/platform";
import { OrganizationEditForm } from "./organization-edit-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";

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
    .select("id,name,slug,timezone,type,address,phone,support_email,consent_text,active,professional_limit")
    .eq("id", id)
    .maybeSingle();

  if (!org) notFound();

  const [{ count: conPerfil }, { count: conEncuentro }] = await Promise.all([
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("org_id", id)
      .not("specialty_profile", "eq", "{}"),
    supabase
      .from("encounters")
      .select("id", { count: "exact", head: true })
      .eq("org_id", id)
      .not("specialty_data", "eq", "{}"),
  ]);
  const tieneDatosEspecialidad = (conPerfil ?? 0) + (conEncuentro ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Editar organización"
        description="Los cambios de nombre e identificador se reflejan en la página pública y en el panel la próxima vez que entren."
      />

      <OrganizationEditForm
        id={org.id}
        slugReserved={RESERVED_SLUGS.has(org.slug)}
        tieneDatosEspecialidad={tieneDatosEspecialidad}
        initial={{
          name: org.name ?? "",
          slug: org.slug ?? "",
          timezone: org.timezone ?? "America/Santiago",
          type: (org.type as "dental" | "medical" | "psychological" | undefined) ?? "dental",
          phone: org.phone ?? "",
          address: org.address ?? "",
          supportEmail: org.support_email ?? "",
          consentText: org.consent_text ?? "",
          active: org.active,
          professionalLimit: org.professional_limit ?? 2,
        }}
      />

      <BackLink href="/dashboard/plataforma/organizaciones">Volver a organizaciones</BackLink>
    </div>
  );
}