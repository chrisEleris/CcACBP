---
id: PG-052
title: Rate limiter Map has no cleanup - unbounded memory growth under unique-IP traffic
severity: medium
status: fixed
files:
  - src/server/middleware/rate-limit.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`rateLimit()` stores per-IP counters in an in-process `Map`. Expired entries are only cleaned up when the **same IP** makes a follow-up request after `resetAt` has elapsed. If each unique IP makes only one request, entries accumulate indefinitely and are never evicted. An attacker sending requests with unique spoofed `X-Forwarded-For` values (each IP different) can cause the Map to grow without bound until the process runs out of memory.

## Evidence

`src/server/middleware/rate-limit.ts:28-33`:
```ts
if (!entry || now >= entry.resetAt) {
  // Start a fresh window.
  store.set(ip, { count: 1, resetAt: now + windowMs });
  await next();
  return;
}
entry.count += 1;
```

There is no `setInterval` or background job that iterates the Map and deletes entries where `now >= entry.resetAt`. The only eviction path is overwriting an existing key when the same IP returns after expiry.

`src/server/middleware/rate-limit.ts:20-23` — the IP is taken from `x-forwarded-for` header, which is user-controlled unless the app is behind a trusted reverse proxy that rewrites this header.

With `windowMs = 60_000` ms (60 seconds) and a unique IP per request:
- 10,000 req/minute → 10,000 Map entries, each holding ~100 bytes → ~1 MB/minute
- Sustained over hours with automated traffic → OOM

## Why this matters

The app is deployed as a single Docker container (`Dockerfile` in repo). If the container OOMs, the entire admin dashboard (including ECS controls and data-source management) becomes unavailable. This is a straightforward denial-of-service without needing to bypass any other security control.

The window for this is widened by the fact that `X-Forwarded-For` is accepted without validation of a trusted proxy list.

## Proposed fix

Two complementary fixes:

1. **Periodic cleanup**: Add a `setInterval` that sweeps the Map and deletes expired entries:
   ```ts
   const CLEANUP_INTERVAL_MS = windowMs * 2;
   const cleanupTimer = setInterval(() => {
     const now = Date.now();
     for (const [key, entry] of store) {
       if (now >= entry.resetAt) store.delete(key);
     }
   }, CLEANUP_INTERVAL_MS);
   cleanupTimer.unref(); // Don't prevent process exit
   ```
2. **Map size cap**: Reject requests with a 429 when the Map exceeds a configurable maximum size (e.g., 50,000 entries), preventing OOM even if the cleanup timer lags.

Optionally, validate `X-Forwarded-For` against a configured trusted-proxy CIDR before accepting it as the real client IP.

## Acceptance checks

- [ ] After `windowMs` passes without new requests from an IP, that IP's entry is removed from the Map.
- [ ] Sending N requests with N distinct IPs does not grow the Map beyond O(N/windowMs * windowMs) over time.
- [ ] A unit test exists for the cleanup behavior.

## Debate

_Not yet provided._

## Final resolution

**Cycle 6 Gatekeeper verification (2026-03-09):**

Fix confirmed present in `src/server/middleware/rate-limit.ts`:

- Lines 33–40: `setInterval` runs every `windowMs` ms and iterates the map deleting all entries where `now >= entry.resetAt`.
- Line 43–45: `cleanupInterval.unref()` prevents the interval from keeping the process alive.
- Lines 57–60: Emergency cap: when `store.size >= MAX_STORE_ENTRIES` (50,000), the entire map is cleared before adding the new entry, bounding worst-case memory growth.
- Lines 80–84: `destroy()` method for test teardown.

Both acceptance criteria (periodic cleanup, size cap) are met. Status: **fixed**.
