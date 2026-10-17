"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PerfilSheetProfile } from "./perfil-sheet";

const PERFIL_PATH = "/dashboard/perfil";

interface PerfilSheetContextValue {
  profile: PerfilSheetProfile;
}

const PerfilSheetContext = createContext<PerfilSheetContextValue | null>(null);

/**
 * La hoja de perfil se enruta, no se guarda en estado: el disparador navega a
 * `/dashboard/perfil` y esa ruta está interceptada en el slot `@perfil`, así que
 * se dibuja sobre la página actual sin desmontarla. Acá solo aportamos los datos
 * que ya trajo la sesión del panel.
 */
export function PerfilSheetProvider({
  profile,
  children,
}: {
  profile: PerfilSheetProfile;
  children: ReactNode;
}) {
  return (
    <PerfilSheetContext.Provider value={{ profile }}>{children}</PerfilSheetContext.Provider>
  );
}

/**
 * Disparador de la hoja. Donde no hay provider (área de plataforma) cae al enlace
 * de siempre, para no romper la navegación del super-admin.
 */
export function PerfilTrigger({
  className,
  title,
  onClick,
  children,
}: {
  className?: string;
  title?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const ctx = useContext(PerfilSheetContext);
  const router = useRouter();
  const pathname = usePathname();
  const activo = pathname.startsWith(PERFIL_PATH);

  const abrir = useCallback(() => {
    onClick?.();
    router.push(PERFIL_PATH, { scroll: false });
  }, [onClick, router]);

  if (!ctx) {
    return (
      <Link href={PERFIL_PATH} className={className} title={title} aria-current={activo ? "page" : undefined}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={abrir}
      className={className}
      title={title}
      aria-haspopup="dialog"
      aria-current={activo ? "page" : undefined}
    >
      {children}
    </button>
  );
}

/** Datos de la sesión para la hoja; null fuera del panel del profesional. */
export function usePerfilSheetProfile(): PerfilSheetProfile | null {
  return useContext(PerfilSheetContext)?.profile ?? null;
}