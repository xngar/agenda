import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDoctor } from "@/lib/auth";
import { PerfilSheetRoute } from "./perfil-sheet-route";

export const dynamic = "force-dynamic";

/**
 * Entrada directa a la ruta: la hoja se dibuja desde acá porque no hay página de
 * debajo que conservar. Detrás queda este fondo mínimo.
 */
export default async function PerfilPage() {
  const session = await requireDoctor();
  if (session.isSuperAdmin) redirect("/dashboard/plataforma/organizaciones");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <PerfilSheetRoute />
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Mi perfil</h1>
        <p className="text-sm text-neutral-600">
          Estos datos identifican tu cuenta dentro de la clínica.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-brand-navy-700 underline underline-offset-4 hover:text-brand-navy"
      >
        Volver a la agenda
      </Link>
    </div>
  );
}