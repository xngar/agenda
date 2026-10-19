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
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-nowrap items-center gap-2 px-4 py-2.5">
          <Link
            href="/dashboard/plataforma/organizaciones"
            aria-label="Ir a organizaciones"
            className="flex shrink-0 items-center gap-2 rounded-lg font-semibold text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-brand-navy to-brand-navy-900 text-white shadow-[0_1px_3px_rgba(11,60,122,0.3),inset_0_1px_0_rgba(255,255,255,0.22)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.9}>
                <path d="M12 3 3 8l9 5 9-5-9-5Z" strokeLinejoin="round" />
                <path d="M3 12l9 5 9-5M3 16l9 5 9-5" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="hidden text-sm sm:inline">Plataforma</span>
          </Link>

          <Link
            href="/dashboard/plataforma/organizaciones"
            className="ml-auto hidden min-h-10 items-center rounded-lg px-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-brand-navy sm:inline-flex"
          >
            Organizaciones
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
            <div className="min-w-0 text-right text-sm leading-tight">
              <p className="max-w-36 truncate font-medium text-neutral-800">{session.full_name}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}