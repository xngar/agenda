import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";

export default async function PlataformaPage() {
  await requireSuperAdmin();
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-navy">Plataforma</h1>
      <ul className="mt-4 space-y-2">
        <li>
          <Link href="/dashboard/plataforma/organizaciones" className="text-brand-sky">
            Organizaciones
          </Link>
        </li>
      </ul>
    </div>
  );
}