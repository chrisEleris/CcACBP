import { timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";
import { config } from "../config";

const MUTATING_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

/**
 * Compares two strings in constant time to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against self to burn roughly the same time, but always return false
    const buf = Buffer.from(a);
    timingSafeEqual(buf, buf);
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * API key authentication middleware for mutating HTTP methods.
 *
 * Checks for credentials in:
 *   - X-API-Key header
 *   - Authorization: Bearer <key> header
 *
 * If the API_KEY environment variable is not set, auth is skipped
 * (development mode).
 */
export async function apiKeyAuth(c: Context, next: Next): Promise<void> {
  const apiKey = config.API_KEY;

  // Skip auth in development mode (no API_KEY configured)
  if (!apiKey) {
    await next();
    return;
  }

  // Only enforce auth on mutating methods
  if (!MUTATING_METHODS.has(c.req.method)) {
    await next();
    return;
  }

  const xApiKey = c.req.header("X-API-Key");
  const authHeader = c.req.header("Authorization");
  const bearerKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  const providedKey = xApiKey ?? bearerKey;

  if (!providedKey || !safeCompare(providedKey, apiKey)) {
    c.res = c.json({ message: "Unauthorized" }, 401);
    return;
  }

  await next();
}
