import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDoctorSession } from "@/lib/auth";
import { LogoutButton } from "../logout-button";
import { NavLinks } from "../nav-links";
import { PerfilSheetProvider, PerfilTrigger } from "./perfil/perfil-sheet-provider";

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
 *
 * `perfil` es el slot paralelo que aloja la hoja de perfil sobre la página
 * actual (ver `@perfil/(.)perfil`); el resto de las rutas cae en su `default`.
 */
export default async function PanelLayout({
  children,
  perfil,
}: {
  children: React.ReactNode;
  perfil: React.ReactNode;
}) {
  const session = await getDoctorSession();
  if (!session) redirect("/dashboard/login");

  // El super admin no opera ninguna clínica: vive en el área de plataforma.
  if (session.isSuperAdmin) redirect("/dashboard/plataforma/organizaciones");

  return (
    <PerfilSheetProvider
      profile={{
        fullName: session.full_name,
        specialty: session.specialty,
        role: session.role,
        roleLabel:
          session.role === "reception" ? "Recepción" : session.isAdmin ? "Administrador" : "Profesional",
      }}
    >
      <div className="min-h-dvh bg-neutral-50">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/dashboard" className="shrink-0 font-semibold text-brand-navy">
              Agenda · Panel
            </Link>

            <NavLinks isAdmin={session.isAdmin} isSuperAdmin={session.isSuperAdmin} />

            <div className="flex shrink-0 items-center gap-3">
              <div className="min-w-0 text-right text-sm leading-tight">
                <PerfilTrigger
                  title="Mi perfil"
                  className="block max-w-48 truncate text-left font-medium text-neutral-800 hover:text-brand-navy hover:underline"
                >
                  {session.full_name}
                </PerfilTrigger>
                {session.specialty ? (
                  <p className="max-w-48 truncate text-xs text-neutral-500">{session.specialty}</p>
                ) : null}
              </div>
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

        {perfil}
      </div>
    </PerfilSheetProvider>
  );
}