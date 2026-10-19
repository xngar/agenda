"use client";

import { useReducedMotion } from "motion/react";
import { DIST, DUR, EASE, STAGGER } from "@/lib/motion";

/**
 * Preferencias de motion del usuario.
 *
 * `useReducedMotion()` devuelve `true` cuando el sistema pide menos
 * movimiento. Cuando está activo, `fadeUp` y `fadeOut` se convierten en
 * fundidos puros (sin desplazamiento) y el stagger se desactiva: el
 * contenido aparece de inmediato, pero sin saltos ni parpadeos.
 */
export function useMotionPrefs() {
  const reduce = useReducedMotion() ?? false;

  return {
    reduce,
    fadeUp: reduce
      ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
      : { hidden: { opacity: 0, y: DIST.md }, visible: { opacity: 1, y: 0 } },
    fadeOut: reduce
      ? { visible: { opacity: 1 }, hidden: { opacity: 0 } }
      : { visible: { opacity: 1, y: 0 }, hidden: { opacity: 0, y: -DIST.sm } },
    stagger: reduce ? 0 : STAGGER,
    duration: reduce ? 0 : DUR.element,
  };
}

export { DIST, DUR, EASE, STAGGER };
