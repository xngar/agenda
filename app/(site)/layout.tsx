import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { getPublicOrganization } from "@/lib/booking";
import { DEFAULT_BRAND, type ClinicBrand } from "@/lib/clinic";

export const dynamic = "force-dynamic";

/**
 * Shell de las rutas públicas heredadas (portada, /reservar, /cita, /privacidad).
 * Estas páginas siguen apuntando a la clínica por defecto; el branding se toma
 * de la organización para no duplicar datos en componentes.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const defaultSlug = DEFAULT_BRAND.slug ?? "sonrisa-dental";
  const org = await getPublicOrganization(defaultSlug).catch(() => null);
  const brand: ClinicBrand = org
    ? {
        name: org.name,
        slug: org.slug,
        address: org.address,
        phone: org.phone,
        supportEmail: org.support_email,
      }
    : DEFAULT_BRAND;

  return (
    <>
      <SiteHeader brand={brand} />
      <div className="flex-1">{children}</div>
      <SiteFooter brand={brand} />
    </>
  );
}