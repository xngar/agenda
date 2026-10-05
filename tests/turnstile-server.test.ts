import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Verificación de Turnstile en el servidor.
 *
 * El fallo que esto fija: `TURNSTILE_ENABLED` se derivaba de
 * `Boolean(process.env.TURNSTILE_SECRET_KEY)`. Si alguien despliega sin la
 * clave, `verifyTurnstile` devolvía `true` para siempre y sin logs: la
 * clínica creyendo que tiene anti-bot y sin él, y nadie se enteraba.
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

    // Sigue dejando reservar (no se corta el despliegue), pero deja rastro.
    expect(await verifyTurnstile(undefined)).toBe(true);

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

    expect(await verifyTurnstile(undefined)).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("con la clave configurada, sin token NO deja pasar", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "clave-secreta-de-prueba");

    const { verifyTurnstile } = await import("@/lib/turnstile");

    // Esta es la parte que importa: con la clave puesta, el hueco de
    // seguridad desaparece y el token pasa a ser obligatorio.
    expect(await verifyTurnstile(undefined)).toBe(false);
    expect(console.error).not.toHaveBeenCalled();
  });
});