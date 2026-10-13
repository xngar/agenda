import type { Metadata } from "next";
import PrivacyNotice from "@/components/privacy-notice";
import { getDefaultOrganization } from "@/lib/booking";
import { DEFAULT_BRAND, type ClinicBrand } from "@/lib/clinic";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description:
    "Cómo tratamos tus datos personales para gestionar tus citas, conforme a la Ley 19.628.",
};

export const dynamic = "force-dynamic";

export default async function PrivacidadPage() {
  const org = await getDefaultOrganization();
  const brand: ClinicBrand = org
    ? {
        name: org.name,
        slug: org.slug,
        address: org.address,
        phone: org.phone,
        supportEmail: org.support_email,
      }
    : DEFAULT_BRAND;

  return <PrivacyNotice brand={brand} consentText={org?.consent_text ?? null} />;
}