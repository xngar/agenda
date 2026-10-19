import "server-only";

import { redirect } from "next/navigation";
import { requireDoctor } from "@/lib/auth";
import { PerfilSheetRoute } from "./perfil-sheet-route";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackLink } from "@/components/dashboard/back-link";

export const dynamic = "force-dynamic";

/**
 * Entrada directa a la ruta: la hoja se dibuja desde acá porque no hay página de
 * debajo que conservar. Detrás queda este fondo mínimo.
 */
export default async function PerfilPage() {
  const session = await requireDoctor();
  if (session.isSuperAdmin) redirect("/dashboard/plataforma/organizaciones");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PerfilSheetRoute />
      <PageHeader
        eyebrow="Cuenta"
        title="Mi perfil"
        description="Estos datos identifican tu cuenta dentro de la clínica."
      />
      <BackLink />
    </div>
  );
}