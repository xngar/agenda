import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { LogoutButton } from "../../logout-button";

export const metadata: Metadata = {
  title: "Plataforma",
  robots: { index: false, follow: false },
};

export default async function PlataformaLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperAdmin();

  return (
    <div className="min-h-dvh bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard/plataforma/organizaciones" className="font-semibold text-brand-navy">
            Plataforma
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/plataforma/organizaciones"
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 sm:inline-block"
            >
              Organizaciones
            </Link>
            <div className="min-w-0 text-right text-sm leading-tight">
              <p className="max-w-48 truncate font-medium text-neutral-800">{session.full_name}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}