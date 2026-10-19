import { requireSuperAdmin } from "@/lib/auth";
import { RotarPasswordForm } from "./rotar-password-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";

export default async function PlataformaSeguridadPage() {
  await requireSuperAdmin();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Seguridad"
        description="Rota la contraseña del equipo de la plataforma cuando quieras: ante cualquier sospecha o cada cierto tiempo por política interna."
      />

      <RotarPasswordForm />

      <BackLink href="/dashboard/plataforma/organizaciones">Volver a organizaciones</BackLink>
    </div>
  );
}
