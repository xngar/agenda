"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Fundido breve entre pantallas del panel.
 *
 * Se usa la ruta como clave: al cambiar de pantalla el contenido se vuelve a
 * montar y entra con un fundido de 200 ms. Sin esto, la navegación entre
 * páginas se lee como un corte seco.
 *
 * El fundido va en CSS a propósito: si el JavaScript no carga o falla, el
 * contenido sigue viéndose (con `opacity` inicial en 0 quedaría invisible).
 */
export function RouteFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="anim-view-fade">
      {children}
    </div>
  );
}
