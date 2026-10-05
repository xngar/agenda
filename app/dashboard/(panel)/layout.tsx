import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDoctorSession } from "@/lib/auth";
import { LogoutButton } from "../logout-button";
import { NavLinks } from "../nav-links";

export const metadata: Metadata = {
  title: "Panel del profesional",
  robots: { index: false, follow: false },
};

/**
 * Shell autenticado del panel.
 *
 * Esta es la comprobación autoritativa: valida contra la base que exista
 * una fila en `doctors` con `active = true`, y de ahí saca `is_admin`.
 * El `proxy.ts` sólo evita mostrar el login a un anónimo; el rol nunca se
 * decide en el cookie, para que revocar un admin no dependa de que
 * expire un token.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getDoctorSession();
  if (!session) redirect("/dashboard/login");

  return (
    <div className="min-h-dvh bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="font-semibold text-brand-navy">
            Agenda · Panel
          </Link>

          <NavLinks isAdmin={session.isAdmin} />

          <div className="flex items-center gap-3">
            <div className="text-right text-sm leading-tight">
              <p className="font-medium text-neutral-800">{session.full_name}</p>
              {session.specialty ? (
                <p className="text-xs text-neutral-500">{session.specialty}</p>
              ) : null}
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}