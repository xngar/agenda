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

function inicialesDe(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

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
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>

        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-nowrap items-center gap-2 px-4 py-2.5">
            <Link
              href="/dashboard"
              aria-label="Ir a la agenda"
              className="flex shrink-0 items-center gap-2 rounded-lg font-semibold text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-brand-navy to-brand-navy-900 text-white shadow-[0_1px_3px_rgba(11,60,122,0.3),inset_0_1px_0_rgba(255,255,255,0.22)]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.9}>
                  <rect x="3" y="5" width="18" height="16" rx="3" />
                  <path d="M8 3v4M16 3v4M3 10h18" />
                </svg>
              </span>
              <span className="hidden text-sm sm:inline">Agenda</span>
              <span className="hidden text-xs font-medium text-neutral-500 xl:inline">· Panel</span>
            </Link>

            <NavLinks isAdmin={session.isAdmin} isSuperAdmin={session.isSuperAdmin} />

            <div className="flex shrink-0 items-center gap-2">
              <PerfilTrigger
                title="Mi perfil"
                className="group flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy sm:pr-3"
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy-100 text-xs font-bold text-brand-navy"
                >
                  {inicialesDe(session.full_name) || "?"}
                </span>
                <span className="hidden min-w-0 text-left leading-tight sm:block">
                  <span className="block max-w-36 truncate text-sm font-medium text-neutral-800 group-hover:text-brand-navy">
                    {session.full_name}
                  </span>
                  {session.specialty ? (
                    <span className="block max-w-36 truncate text-xs text-neutral-500">
                      {session.specialty}
                    </span>
                  ) : null}
                </span>
              </PerfilTrigger>
              <LogoutButton />
            </div>
          </div>
        </header>

        <main
          id="contenido"
          tabIndex={-1}
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-6 focus-visible:outline-none"
        >
          {children}
        </main>

        {perfil}
      </div>
    </PerfilSheetProvider>
  );
}