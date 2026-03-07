import { timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";
import { config } from "../config";

/**
 * Compares two strings in constant time to prevent timing attacks.
 * When lengths differ, pads both buffers to the same length before comparing
 * so that the comparison always runs, preventing length-based timing leaks.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Pad shorter to match longer length so timingSafeEqual can run.
    // Always return false since lengths differ.
    const maxLen = Math.max(bufA.length, bufB.length);
    const paddedA = Buffer.alloc(maxLen);
    const paddedB = Buffer.alloc(maxLen);
    bufA.copy(paddedA);
    bufB.copy(paddedB);
    timingSafeEqual(paddedA, paddedB);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
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
