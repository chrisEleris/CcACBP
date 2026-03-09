import { createHmac, timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";
import { config } from "../config";

// Fixed HMAC salt — its value is not secret; it only ensures both inputs
// are hashed to the same fixed length before the constant-time comparison,
// eliminating the length-based timing side channel.
const HMAC_SALT = Buffer.alloc(32);

/**
 * Compares two strings in constant time to prevent timing attacks.
 *
 * Both inputs are HMAC-SHA256 digested to a fixed 32-byte length before the
 * comparison, so the execution time does not leak information about key length
 * or the position of the first differing byte.
 */
function safeCompare(a: string, b: string): boolean {
  const ha = createHmac("sha256", HMAC_SALT).update(a).digest();
  const hb = createHmac("sha256", HMAC_SALT).update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * API key authentication middleware for all HTTP methods.
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
