/**
 * Constantes compartidas del panel de plataforma.
 */

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Identificadores que ya ocupan una ruta estática del sitio. Un slug con
 * estos valores dejaría la clínica inalcanzable en `/{slug}`, así que se
 * rechazan al crear la organización (y al cambiar el slug por uno distinto).
 */
export const RESERVED_SLUGS = new Set([
  "reservar",
  "privacidad",
  "cita",
  "dashboard",
  "api",
  "plataforma",
  "login",
  "_next",
]);