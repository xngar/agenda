import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { RotarPasswordForm } from "./rotar-password-form";

export default async function PlataformaSeguridadPage() {
  await requireSuperAdmin();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/dashboard/plataforma/organizaciones"
        className="text-sm font-medium text-brand-sky hover:underline"
      >
        ← Organizaciones
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-brand-navy">Seguridad</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Rota la contraseña del equipo de la plataforma cuando quieras: ante cualquier sospecha
        o cada cierto tiempo por política interna.
      </p>

      <div className="mt-6">
        <RotarPasswordForm />
      </div>
    </div>
  );
}
