/**
 * Formato y parseo de montos en pesos chilenos (sin decimales).
 *
 * Los inputs nativos `type=number` no entienden el punto de miles: un
 * paciente/usuario que escribe `39.900` queriendo decir treinta y nueve mil
 * novecientos termina guardando `39.9`. Estos helpers trabajan con texto:
 * se muestra con puntos de miles en vivo y se envía como número entero.
 */
export function formatMiles(valor: string): string {
  const digitos = valor.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digitos) return "";
  return Number(digitos).toLocaleString("es-CL");
}

export function parseMiles(valor: string): number | null {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return null;
  const n = Number(digitos);
  return Number.isFinite(n) ? n : null;
}
