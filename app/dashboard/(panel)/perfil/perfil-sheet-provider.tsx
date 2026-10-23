"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { PerfilSheet, type PerfilSheetProfile } from "./perfil-sheet";

const PERFIL_PATH = "/dashboard/perfil";

interface PerfilSheetContextValue {
  profile: PerfilSheetProfile;
  openProfile: () => void;
  avatarVersion: number;
  setHasAvatar: (hasAvatar: boolean) => void;
}

const PerfilSheetContext = createContext<PerfilSheetContextValue | null>(null);

/**
 * La hoja se abre localmente con los datos de sesión ya disponibles para evitar
 * una navegación de servidor antes de mostrar el formulario.
 */
export function PerfilSheetProvider({
  profile,
  children,
}: {
  profile: PerfilSheetProfile;
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const [hasAvatar, setHasAvatar] = useState(profile.hasAvatar);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const openProfile = useCallback(() => setAbierto(true), []);
  const updateAvatar = useCallback((next: boolean) => {
    setHasAvatar(next);
    setAvatarVersion((version) => version + 1);
  }, []);
  const contextValue = useMemo(
    () => ({
      profile: { ...profile, hasAvatar },
      openProfile,
      avatarVersion,
      setHasAvatar: updateAvatar,
    }),
    [profile, hasAvatar, openProfile, avatarVersion, updateAvatar],
  );

  return (
    <PerfilSheetContext.Provider value={contextValue}>
      {children}
      <PerfilSheet
        profile={contextValue.profile}
        onAvatarChange={updateAvatar}
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
      />
    </PerfilSheetContext.Provider>
  );
}

/**
 * Disparador local de la hoja. Donde no hay provider (área de plataforma) cae al
 * enlace de siempre, para no romper la navegación del super-admin.
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
  const pathname = usePathname();
  const activo = pathname.startsWith(PERFIL_PATH);

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
      onClick={() => {
        onClick?.();
        ctx.openProfile();
      }}
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

export function usePerfilAvatar(): {
  hasAvatar: boolean;
  avatarVersion: number;
  setHasAvatar: (hasAvatar: boolean) => void;
} | null {
  const ctx = useContext(PerfilSheetContext);
  return ctx
    ? {
        hasAvatar: ctx.profile.hasAvatar,
        avatarVersion: ctx.avatarVersion,
        setHasAvatar: ctx.setHasAvatar,
      }
    : null;
}