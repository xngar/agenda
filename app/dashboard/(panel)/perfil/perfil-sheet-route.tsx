"use client";

import { useRouter } from "next/navigation";
import { PerfilSheet } from "./perfil-sheet";
import { usePerfilSheetProfile } from "./perfil-sheet-provider";

/**
 * Envoltura de ruta de la hoja.
 *
 * `volverAtras` distingue los dos caminos: coming del slot interceptado la hoja
 * se cierra con `router.back()` (y si el usuario entró por URL directa, el
 * browser atrás se lo sacaría del sitio, así que en ese caso vamos a la agenda).
 */
export function PerfilSheetRoute({ volverAtras = false }: { volverAtras?: boolean }) {
  const router = useRouter();
  const profile = usePerfilSheetProfile();
  if (!profile) return null;

  return (
    <PerfilSheet
      profile={profile}
      abierto
      onCerrar={() => {
        if (volverAtras) router.back();
        else router.push("/dashboard");
      }}
    />
  );
}