import type { Context, MiddlewareHandler, Next } from "hono";

type RateLimitStore = Map<string, { count: number; resetAt: number }>;

const MAX_STORE_ENTRIES = 50_000;

/**
 * Creates a simple in-process sliding-window rate-limit middleware.
 *
 * Each unique IP address is tracked in a per-instance Map. This is intentionally
 * a single-process implementation suitable for this application's deployment model
 * (a single Node.js container). For multi-instance deployments a shared store such
 * as Redis would be required.
 *
 * Memory management:
 * - A periodic cleanup interval removes expired entries every `windowMs`.
 * - When the store exceeds MAX_STORE_ENTRIES, the entire map is cleared as an
 *   emergency measure to prevent unbounded memory growth from unique IPs.
 *
 * @param maxRequests - Maximum allowed requests per window.
 * @param windowMs    - Window duration in milliseconds.
 * @returns An object with the Hono middleware handler and a `destroy()` method
 *          to stop the background cleanup interval (useful in tests).
 */
export function rateLimit(
  maxRequests: number,
  windowMs: number,
): MiddlewareHandler & { destroy: () => void } {
  const store: RateLimitStore = new Map();

  // Periodically evict expired entries to prevent unbounded memory growth
  // from unique IPs that never revisit within their window.
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(ip);
      }
    }
  }, windowMs);

  // Allow the Node.js event loop to exit even when the interval is active.
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  const handler: MiddlewareHandler = async (c: Context, next: Next): Promise<void> => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0].trim() ??
      c.req.header("x-real-ip") ??
      "unknown";

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now >= entry.resetAt) {
      // Emergency cap: if the store has grown too large, clear it entirely.
      if (store.size >= MAX_STORE_ENTRIES) {
        store.clear();
      }
      // Start a fresh window.
      store.set(ip, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      c.res = c.json({ message: "Too Many Requests" }, 429);
      c.res.headers.set("Retry-After", String(retryAfterSec));
      return;
    }

    await next();
  };

  // Attach a destroy method to the handler for test teardown.
  (handler as MiddlewareHandler & { destroy: () => void }).destroy = () => {
    clearInterval(cleanupInterval);
  };

  return handler as MiddlewareHandler & { destroy: () => void };
}
