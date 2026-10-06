import { notFound } from "next/navigation";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { getPublicOrganization } from "@/lib/booking";
import { type ClinicBrand } from "@/lib/clinic";

export const dynamic = "force-dynamic";

/**
 * Shell público de una clínica: cabecera y pie con la identidad de la
 * organización del slug. Si la clínica no existe o está inactiva, 404.
 */
export default async function ClinicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  const org = await getPublicOrganization(clinicSlug).catch(() => null);
  if (!org) notFound();

  const brand: ClinicBrand = {
    name: org.name,
    slug: org.slug,
    address: org.address,
    phone: org.phone,
    supportEmail: org.support_email,
  };

  return (
    <>
      <SiteHeader brand={brand} />
      <div className="flex-1">{children}</div>
      <SiteFooter brand={brand} />
    </>
  );
}