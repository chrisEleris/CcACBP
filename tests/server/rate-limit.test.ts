import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "../../src/server/middleware/rate-limit";

/**
 * Helper: build a minimal Hono app with the rate-limit middleware applied.
 * Returns the app and the limiter so destroy() can be called in teardown.
 */
function buildApp(maxRequests: number, windowMs: number) {
  const limiter = rateLimit(maxRequests, windowMs);
  const app = new Hono();
  app.use("/*", limiter);
  app.get("/ping", (c) => c.json({ ok: true }));
  return { app, limiter };
}

/**
 * Send `count` GET requests to /ping from the given IP.
 */
async function sendRequests(app: Hono, count: number, ip = "1.2.3.4"): Promise<Response[]> {
  const results: Response[] = [];
  for (let i = 0; i < count; i++) {
    const res = await app.request("/ping", {
      headers: { "x-forwarded-for": ip },
    });
    results.push(res);
  }
  return results;
}

describe("rateLimit middleware (PG-054)", () => {
  let limiter: ReturnType<typeof rateLimit> | null = null;

  afterEach(() => {
    // Always stop background intervals to avoid leaking timers between tests.
    if (limiter) {
      limiter.destroy();
      limiter = null;
    }
    vi.useRealTimers();
  });

  it("allows requests within the limit", async () => {
    const { app, limiter: l } = buildApp(5, 60_000);
    limiter = l;
    const responses = await sendRequests(app, 5);
    for (const res of responses) {
      expect(res.status).toBe(200);
    }
  });

  it("blocks the request that exceeds the limit with status 429", async () => {
    const { app, limiter: l } = buildApp(3, 60_000);
    limiter = l;
    // First 3 should succeed, 4th should be rate-limited.
    const responses = await sendRequests(app, 4);
    expect(responses[0].status).toBe(200);
    expect(responses[1].status).toBe(200);
    expect(responses[2].status).toBe(200);
    expect(responses[3].status).toBe(429);
  });

  it("returns a Retry-After header on 429 response", async () => {
    const { app, limiter: l } = buildApp(1, 60_000);
    limiter = l;
    // First request opens window, second exceeds it.
    await sendRequests(app, 1);
    const [blocked] = await sendRequests(app, 1);
    expect(blocked.status).toBe(429);
    const retryAfter = blocked.headers.get("Retry-After");
    expect(retryAfter).not.toBeNull();
    const seconds = Number(retryAfter);
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThanOrEqual(60);
  });

  it("allows requests again after the window expires", async () => {
    vi.useFakeTimers();
    const windowMs = 1_000;
    const { app, limiter: l } = buildApp(2, windowMs);
    limiter = l;

    // Fill up the window for IP A.
    const initialResponses = await sendRequests(app, 2, "10.0.0.1");
    expect(initialResponses[0].status).toBe(200);
    expect(initialResponses[1].status).toBe(200);

    // 3rd request should be blocked.
    const [blocked] = await sendRequests(app, 1, "10.0.0.1");
    expect(blocked.status).toBe(429);

    // Advance time past the window so the entry expires.
    vi.advanceTimersByTime(windowMs + 1);

    // Now the same IP should be allowed again.
    const [allowed] = await sendRequests(app, 1, "10.0.0.1");
    expect(allowed.status).toBe(200);
  });

  it("cleanup interval removes expired entries", async () => {
    vi.useFakeTimers();
    const windowMs = 500;
    const { app, limiter: l } = buildApp(10, windowMs);
    limiter = l;

    // Generate some traffic to create store entries.
    await sendRequests(app, 3, "192.168.1.1");
    await sendRequests(app, 3, "192.168.1.2");

    // Advance past the window so entries expire, then trigger the cleanup interval.
    vi.advanceTimersByTime(windowMs + 1);

    // After cleanup, the IPs should get fresh windows (status 200).
    const [r1] = await sendRequests(app, 1, "192.168.1.1");
    const [r2] = await sendRequests(app, 1, "192.168.1.2");
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
  });

  it("different IPs have independent rate-limit windows", async () => {
    const { app, limiter: l } = buildApp(2, 60_000);
    limiter = l;

    // Fill up the limit for IP A.
    const aResponses = await sendRequests(app, 3, "10.0.0.1");
    expect(aResponses[2].status).toBe(429);

    // IP B should still have its own fresh window.
    const [bResponse] = await sendRequests(app, 1, "10.0.0.2");
    expect(bResponse.status).toBe(200);
  });

  it("destroy() stops the background interval without throwing", () => {
    const { limiter: l } = buildApp(10, 60_000);
    limiter = l;
    expect(() => l.destroy()).not.toThrow();
    limiter = null; // prevent afterEach from calling destroy() again
  });
});
