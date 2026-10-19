import { requireSuperAdmin } from "@/lib/auth";
import OrganizationForm from "./organization-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";

export default async function NuevaOrganizacionPage() {
  await requireSuperAdmin();
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Crear clínica"
        description="Da de alta una clínica junto con su administrador inicial. La clínica arranca con servicios y horario por defecto que luego se pueden ajustar."
      />
      <OrganizationForm />
      <BackLink href="/dashboard/plataforma/organizaciones">Volver a organizaciones</BackLink>
    </div>
  );
}