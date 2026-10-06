import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import OrganizationForm from "./organization-form";

export default async function NuevaOrganizacionPage() {
  await requireSuperAdmin();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        href="/dashboard/plataforma/organizaciones"
        className="text-sm text-brand-sky"
      >
        ← Organizaciones
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-brand-navy">Crear clínica</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Da de alta una clínica junto con su administrador inicial. La clínica arranca con
        servicios y horario por defecto que luego se pueden ajustar.
      </p>
      <OrganizationForm />
    </div>
  );
}