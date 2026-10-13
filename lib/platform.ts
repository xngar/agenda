/**
 * Constantes compartidas del panel de plataforma.
 */

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Formatea el identificador en vivo: minúsculas, espacios a guiones, sin
 * caracteres raros ni guiones duplicados. "Clínica San José" -> "clinica-san-jose".
 */
export function formatSlugValue(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-");
}

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