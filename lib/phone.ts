/**
 * Teléfono chileno para el flujo de reserva.
 *
 * Mostramos siempre el prefijo "+56" y dejamos que el paciente escriba sólo
 * el resto: pedir el código de país a mano es una fuente clásica de números
 * mal ingresados. Guardamos y normalizamos como "+56XXXXXXXXX" (sin espacios)
 * para que coincida entre reservas y fichas.
 */

/** Agrupa la parte local para leerla cómodo: "912345678" -> "9 1234 5678". */
function groupPhoneLocal(local: string): string {
  if (local.length === 0) return "";
  if (local.startsWith("9")) {
    return [local.slice(0, 1), local.slice(1, 5), local.slice(5, 9)]
      .filter(Boolean)
      .join(" ");
  }
  const chunks: string[] = [];
  for (let i = 0; i < local.length; i += 4) chunks.push(local.slice(i, i + 4));
  return chunks.join(" ");
}

/** Deja sólo la parte local, sin el código de país "56". */
function localDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("56")) digits = digits.slice(2);
  return digits;
}

/**
 * Formatea progresivamente lo que se escribe, garantizando el prefijo "+56".
 * Acepta que el paciente pegue el número pelado ("912345678") o con código
 * de país ("+56912345678") y en ambos casos muestra "+56 9 1234 5678".
 */
export function formatPhonePartial(input: string): string {
  return `+56 ${groupPhoneLocal(localDigits(input))}`;
}

/** Normaliza a "+56XXXXXXXXX" (sin espacios). Devuelve "" si no hay dígitos. */
export function normalizePhone(input: string): string {
  const local = localDigits(input);
  return local ? `+56${local}` : "";
}

/** Acepta móviles (9 dígitos) y fijos (8 dígitos) chilenos. */
export function isValidPhone(input: string): boolean {
  return /^\d{8,9}$/.test(localDigits(input));
}
