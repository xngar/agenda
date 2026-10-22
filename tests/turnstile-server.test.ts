import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Verificación de Turnstile en el servidor.
 *
 * Si alguien despliega sin la clave, las reservas se bloquean y se deja
 * constancia en los logs en vez de omitir la protección silenciosamente.
 *
 * El módulo se importa de forma dinámica porque `TURNSTILE_ENABLED` se
 * evalúa al cargar el archivo, así que hay que reseteear los módulos entre
 * prueba y prueba. El entorno se ajusta con `vi.stubEnv` porque `NODE_ENV`
 * es de sólo lectura en los tipos de Next.
 */
describe("verifyTurnstile", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("en producción AVISA si la clave no está configurada", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { verifyTurnstile } = await import("@/lib/turnstile");

    expect(await verifyTurnstile(undefined)).toBe("unavailable");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("TURNSTILE_SECRET_KEY"),
    );
  });

  it("avisa una sola vez, no en cada reserva", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { verifyTurnstile } = await import("@/lib/turnstile");

    await verifyTurnstile(undefined);
    await verifyTurnstile(undefined);
    await verifyTurnstile(undefined);

    const llamadas = (console.error as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c) => String(c[0]).includes("TURNSTILE_SECRET_KEY"),
    );
    expect(llamadas).toHaveLength(1);
  });

  it("en desarrollo se omite en silencio, sin ruido en los logs", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { verifyTurnstile } = await import("@/lib/turnstile");

    expect(await verifyTurnstile(undefined)).toBe("verified");
    expect(console.error).not.toHaveBeenCalled();
  });

  it("con la clave configurada, sin token NO deja pasar", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "clave-secreta-de-prueba");

    const { verifyTurnstile } = await import("@/lib/turnstile");

    expect(await verifyTurnstile(undefined)).toBe("invalid");
    expect(console.error).not.toHaveBeenCalled();
  });
});