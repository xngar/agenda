import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDoctorSession } from "@/lib/auth";
import { PanelShell } from "@/components/dashboard/panel-shell";
import { LogoutButton } from "../logout-button";
import { PerfilSheetProvider, PerfilTrigger } from "./perfil/perfil-sheet-provider";
import { RouteFade } from "@/components/motion/route-fade";

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
      <PanelShell
        isAdmin={session.isAdmin}
        isSuperAdmin={session.isSuperAdmin}
        profileTrigger={
          <PerfilTrigger
            title="Mi perfil"
            className="group flex items-center gap-2 rounded-full border border-panel-line bg-white py-1 pl-1 pr-1 shadow-panel transition-colors hover:bg-panel-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy sm:pr-3"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy-100 text-xs font-bold text-brand-navy"
            >
              {inicialesDe(session.full_name) || "?"}
            </span>
            <span className="hidden min-w-0 text-left leading-tight sm:block">
              <span className="block max-w-36 truncate text-sm font-medium text-panel-ink group-hover:text-brand-navy">
                {session.full_name}
              </span>
              {session.specialty ? (
                <span className="block max-w-36 truncate text-xs text-panel-muted">
                  {session.specialty}
                </span>
              ) : null}
            </span>
          </PerfilTrigger>
        }
        logout={<LogoutButton />}
      >
        <RouteFade>{children}</RouteFade>
      </PanelShell>
      {perfil}
    </PerfilSheetProvider>
  );
}
