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

  const roleLabel =
    session.role === "reception" ? "Recepción" : session.isAdmin ? "Administrador" : "Profesional";

  return (
    <PerfilSheetProvider
      profile={{
        fullName: session.full_name,
        specialty: session.specialty,
        role: session.role,
        roleLabel,
      }}
    >
      <PanelShell
        isAdmin={session.isAdmin}
        isSuperAdmin={session.isSuperAdmin}
        profileTrigger={
          <PerfilTrigger
            title="Mi perfil"
            className="group flex w-full flex-col items-center gap-2 rounded-[var(--panel-radius-card)] bg-white px-4 py-5 text-center transition-colors duration-micro ease-out-soft hover:bg-action-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
          >
            <span
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-brand-navy shadow-sm ring-1 ring-brand-sky-200"
            >
              {inicialesDe(session.full_name) || "?"}
            </span>
            <span className="block w-full truncate text-sm font-semibold leading-5 text-panel-ink">
              {session.full_name}
            </span>
            <span className="inline-flex items-center rounded-full bg-brand-sky px-2.5 py-0.5 text-[11px] font-semibold leading-4 text-brand-navy">
              {roleLabel}
            </span>
          </PerfilTrigger>
        }
        logout={<LogoutButton variant="sidebar" />}
      >
        <RouteFade>{children}</RouteFade>
      </PanelShell>
      {perfil}
    </PerfilSheetProvider>
  );
}
