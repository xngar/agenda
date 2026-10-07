import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PrivacyNotice from "@/components/privacy-notice";
import { getPublicOrganization } from "@/lib/booking";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description:
    "Cómo tratamos tus datos personales para gestionar tus citas, conforme a la Ley 19.628.",
};

export const dynamic = "force-dynamic";

export default async function PrivacidadPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  const org = await getPublicOrganization(clinicSlug).catch(() => null);
  if (!org) notFound();

  return (
    <PrivacyNotice
      brand={{
        name: org.name,
        slug: org.slug,
        address: org.address,
        phone: org.phone,
        supportEmail: org.support_email,
      }}
      consentText={org.consent_text}
    />
  );
}