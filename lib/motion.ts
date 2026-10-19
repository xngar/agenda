/**
 * Tokens de animación del panel.
 *
 * Los mismos valores viven como custom properties en `app/globals.css`
 * (`--motion-*`) para el CSS puro. Aquí están como constantes para
 * `motion/react`. Son la misma fuente de verdad: si cambias uno, cambia el otro.
 *
 * Reglas de casa:
 * - Microinteracciones (hover, focus, press): `DUR.micro`.
 * - Transiciones de un elemento (modal, menú, fila): `DUR.element`.
 * - Entradas de sección o página: `DUR.section`.
 * - Solo se animan `transform` y `opacity`.
 */

/** Microinteracciones: hover, focus, press, indicador activo. */
export const DUR = {
  micro: 0.15,
  /** Transiciones de un elemento: modal, menú, fila, panel. */
  element: 0.24,
  /** Entradas de sección o página. */
  section: 0.32,
  /** Cambio de vista o de ruta. */
  view: 0.2,
  /** Conteo animado de un número. */
  count: 0.4,
} as const;

/**
 * Easings. `out` para entradas, `in` para salidas, `inOut` para cambios de
 * estado. Sin rebotes: la curva de salida ya frena sola.
 */
export const EASE = {
  out: [0.16, 1, 0.3, 1],
  in: [0.4, 0, 1, 1],
  inOut: [0.4, 0, 0.2, 1],
} as const;

/** Desplazamiento vertical de las entradas. */
export const DIST = {
  sm: 8,
  md: 10,
  lg: 12,
} as const;

/** Separación entre elementos de una entrada escalonada. */
export const STAGGER = 0.035;

/** Variante estándar de entrada: fade + desplazamiento vertical corto. */
export const fadeUp = {
  hidden: { opacity: 0, y: DIST.md },
  visible: { opacity: 1, y: 0 },
} as const;

/** Variante estándar de salida. */
export const fadeOut = {
  visible: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: -DIST.sm },
} as const;
