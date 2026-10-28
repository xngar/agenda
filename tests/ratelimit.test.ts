import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  serverEnv: () => ({
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
  }),
}));

import { checkRateLimit } from "@/lib/ratelimit";

describe("checkRateLimit sin Upstash", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("en producción aplica el límite local sin bloquear el servicio", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const first = await checkRateLimit("login-test", "ip-1", { requests: 2, windowMs: 60_000 });
    const second = await checkRateLimit("login-test", "ip-1", { requests: 2, windowMs: 60_000 });
    const third = await checkRateLimit("login-test", "ip-1", { requests: 2, windowMs: 60_000 });

    expect(first).toMatchObject({ ok: true, remaining: 1, available: true });
    expect(second).toMatchObject({ ok: true, remaining: 0, available: true });
    expect(third).toMatchObject({ ok: false, remaining: 0, available: true });
  });
});
