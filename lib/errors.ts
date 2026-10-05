import { BUSINESS_ERROR_MESSAGES, type BusinessErrorCode } from "./types";

/**
 * Errores de negocio que la base devuelve como SQLSTATE A0001..A0005.
 * El cliente nunca ve un código SQL: sólo el texto en español.
 */
export class BusinessError extends Error {
  readonly code: BusinessErrorCode;
  readonly status: number;

  constructor(code: BusinessErrorCode, status = 409) {
    super(BUSINESS_ERROR_MESSAGES[code]);
    this.name = "BusinessError";
    this.code = code;
    this.status = status;
  }
}

const STATUS_BY_CODE: Record<BusinessErrorCode, number> = {
  A0001: 409,
  A0002: 409,
  A0003: 404,
  A0004: 409,
  A0005: 409,
  A0006: 422,
};

/** Traduce el `code` de un error de Supabase a un error de negocio. */
export function toBusinessError(error: unknown): BusinessError {
  const code = readPgCode(error);

  if (code && code in BUSINESS_ERROR_MESSAGES) {
    const key = code as BusinessErrorCode;
    return new BusinessError(key, STATUS_BY_CODE[key]);
  }

  // Un exclusion violation que se escapó significa carrera por la hora.
  if (code === "23P01") return new BusinessError("A0001");

  return new BusinessError("A0002", 400);
}

function readPgCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as { code?: unknown; message?: unknown };
  if (typeof candidate.code === "string") return candidate.code;
  // PostgREST devuelve el código dentro de message en algunos clientes.
  if (typeof candidate.message === "string") {
    const match = /SQLSTATE\s+([0-9A-Z]{5})/i.exec(candidate.message);
    if (match) return match[1] ?? null;
  }
  return null;
}

/** Respuesta JSON genérica. Nunca filtra detalles internos. */
export function errorResponse(code: BusinessErrorCode, extra?: { field?: string }) {
  return Response.json(
    {
      error: BUSINESS_ERROR_MESSAGES[code],
      code,
      ...(extra?.field ? { field: extra.field } : {}),
    },
    { status: STATUS_BY_CODE[code] },
  );
}