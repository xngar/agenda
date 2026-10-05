import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Token de gestión de cita.
 *
 * - 32 bytes aleatorios -> 64 caracteres hex (256 bits de entropía).
 * - En la base sólo se guarda el SHA-256 (`manage_token_hash`).
 * - Para poder reenviar el link 24 h antes se guarda además una copia
 *   cifrada con pgp_sym_encrypt (ver migración 0003), que sólo se abre
 *   con MANAGE_TOKEN_KEY desde el servidor.
 * - La comparación es en tiempo constante (timingSafeEqual).
 */

export const MANAGE_TOKEN_BYTES = 32;
export const MANAGE_TOKEN_LENGTH = MANAGE_TOKEN_BYTES * 2;

const HEX_64 = /^[0-9a-f]{64}$/;

export function generateManageToken(): string {
  return randomBytes(MANAGE_TOKEN_BYTES).toString("hex");
}

export function hashManageToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isManageTokenShape(token: string): boolean {
  return new RegExp(`^[0-9a-f]{${MANAGE_TOKEN_LENGTH}}$`).test(token);
}

export function isTokenHashShape(hash: string): boolean {
  return HEX_64.test(hash);
}

/** Comparación en tiempo constante de dos hashes hex de 64 caracteres. */
export function safeCompareHash(a: string, b: string): boolean {
  if (!isTokenHashShape(a) || !isTokenHashShape(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}