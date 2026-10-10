/**
 * Validación y formateo de RUT chileno.
 *
 * El RUT es un identificador, no un dato de salud: lo pedimos porque la
 * clínica lo exige para identificar al paciente en la ficha, y sólo se
 * usa con ese fin.
 */

/** Agrupa dígitos con puntos de miles: "12345678" -> "12.345.678". */
function groupThousands(digits: string): string {
  const groups: string[] = [];
  let rest = digits;
  while (rest.length > 3) {
    groups.unshift(rest.slice(-3));
    rest = rest.slice(0, -3);
  }
  if (rest.length > 0) groups.unshift(rest);
  return groups.join(".");
}

/**
 * El último grupo acepta dígitos *y* letras: el verificador es `0-9` salvo
 * que sea 10 ("K") o 11 ("0"). Con `[dkK]` acá se rechazaba todo RUT
 * corriente (por ejemplo 12345678-5) y sólo pasaban los que terminaban en
 * d o k, que son una minoría.
 */
const RUT_REGEX = /^(\d{1,2})\.?(\d{3})\.?(\d{3})-?([0-9dkK])$/;

/**
 * Normaliza a sólo dígitos + verificador.
 *
 * Se quitan espacios, puntos **y guiones**: el separador entre grupos es
 * opcional en la práctica y los pacientes escriben las tres variantes
 * ("12.345.678-5", "12-345-678-5", "123456785"). Antes sólo se quitaban
 * espacios y puntos, así que la forma con guiones quedaba rechazada.
 */
export function normalizeRut(input: string): string {
  return input.replace(/[\s.\-]/g, "").toUpperCase();
}

/** Calcula el dígito verificador para los primeros dígitos del RUT. */
export function rutVerifier(digits: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += Number(digits[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const mod = 11;
  const check = 11 - (sum % mod);
  if (check === 10) return "K";
  if (check === 11) return "0";
  return String(check);
}

export function isValidRut(input: string): boolean {
  const clean = normalizeRut(input);
  const match = RUT_REGEX.exec(clean);
  if (!match) return false;

  const [, body, first, second, verifier] = match;
  const digits = `${body}${first}${second}`;

  // El RUT no puede empezar en cero. Antes se comprobaba además que los
  // grupos internos no empezaran en cero (`first`/`second`), lo que
  // rechazaba RUTs perfectly legítimos cuyo segundo grupo es "000":
  // 10.000.013-K, 1.000.013-0, 20.000.045-2... Es una franja angosta pero
  // real, y el paciente no tiene por qué saber que su RUT "no existe".
  if (/^0/.test(digits)) return false;

  return rutVerifier(digits) === verifier.toUpperCase();
}

/**
 * "123456789" -> "12.345.678-9". Devuelve `null` si no es un RUT válido.
 *
 * Antes sólo comprobaba la FORMA (misma regex que `isValidRut`) y devolvía
 * "12.345.678-9" para un RUT con verificador incorrecto: el resultado
 * parecía un RUT legitimo y el dato malo pasaba inadvertido. Ahora exige
 * verificador correcto, como promete el comentario.
 */
export function formatRut(input: string): string | null {
  const clean = normalizeRut(input);
  if (!isValidRut(clean)) return null;

  const match = RUT_REGEX.exec(clean);
  if (!match) return null;

  const [, body, first, second, verifier] = match;
  return `${body}.${first}.${second}-${verifier.toUpperCase()}`;
}

/**
 * Formatea progresivamente lo que el paciente escribe, sin exigir que el
 * RUT esté completo ni que el verificador sea correcto. Es para el `input`
 * en vivo, donde la validación todavía no tiene sentido.
 *
 * A partir de 8 caracteres asumimos que el último es el verificador: los
 * cuerpos de RUT tienen 7 u 8 dígitos, así que con 8 ya podemos separar
 * ("1.234.567-8" o el intermedio "1.234.567-8" que se corrige al terminar
 * de escribir el noveno). Antes de eso mostramos todo como cuerpo con
 * puntos, para no insertar un guión prematuro en "12".
 */
export function formatRutPartial(input: string): string {
  const chars = input.replace(/[^0-9kK]/g, "").toUpperCase();
  if (chars.length === 0) return "";
  if (chars.length <= 7) return groupThousands(chars);
  return `${groupThousands(chars.slice(0, -1))}-${chars.slice(-1)}`;
}