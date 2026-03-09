---
id: PG-071
title: scryptSync called on every encrypt/decrypt invocation — 46ms blocking delay per call, ~9.2s for 200-row list
severity: medium
status: fixed
files: [src/server/lib/crypto.ts, src/server/routes/data-sources.ts]
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`keyBuffer()` in `crypto.ts` calls `scryptSync()` synchronously on every call to `encrypt()` or `decrypt()`. The Node.js default scrypt parameters (N=16384, r=8, p=1) produce a ~46ms blocking call on the test machine. `redactDataSource()` in `data-sources.ts` calls `decryptConfig()` (which calls `decrypt()`, which calls `keyBuffer()`) for every row returned. With the pagination limit of 200, a single `GET /api/data-sources` request blocks the Node.js event loop for approximately 200 × 46ms ≈ 9.2 seconds.

## Evidence

`src/server/lib/crypto.ts` lines 18–20, 31, 60:

```typescript
function keyBuffer(secret: string): Buffer {
  return scryptSync(secret, KDF_SALT, KEY_LENGTH);  // ~46ms blocking call
}

export function encrypt(plaintext: string, secret: string): string {
  ...
  const key = keyBuffer(secret);  // called every time
  ...
}

export function decrypt(encoded: string, secret: string): string {
  ...
  const key = keyBuffer(secret);  // called every time
  ...
}
```

`src/server/routes/data-sources.ts` line 148:

```typescript
data: all.map(redactDataSource),  // calls decrypt once per row
```

`src/server/lib/pagination.ts` line 5: `const MAX_LIMIT = 200;` — up to 200 rows per request.

Measured benchmark (Node.js 22):

```
scrypt (N=16384, r=8, p=1): ~46ms per call
10 sequential calls: ~462ms
200 calls: ~9,200ms estimated
```

The SECRET_KEY is a fixed per-process value read from `config.SECRET_KEY` — it never changes within a process lifetime, making memoization safe and correct. The derived key is deterministic given the same secret.

## Why this matters

1. **Event loop blocking**: `scryptSync` is a synchronous CPU-bound call. In Node.js, any synchronous operation >10ms noticeably degrades throughput. 46ms × 200 = 9.2 seconds during which no other requests can be processed.
2. **DoS amplification**: An authenticated caller can set `?limit=200` and issue repeated requests to saturate the event loop.
3. **Design intent mismatch**: The scrypt KDF was introduced specifically to protect against brute-force of weak secrets. The high N value (16384) is a deliberate cost parameter — but that cost should be paid once (at startup or first use), not on every API call.

## Proposed fix

Memoize `keyBuffer` so the scrypt derivation runs at most once per unique secret per process lifetime:

```typescript
const derivedKeyCache = new Map<string, Buffer>();

function keyBuffer(secret: string): Buffer {
  const cached = derivedKeyCache.get(secret);
  if (cached) return cached;
  const key = scryptSync(secret, KDF_SALT, KEY_LENGTH);
  derivedKeyCache.set(secret, key);
  return key;
}
```

Since `SECRET_KEY` is a single value per process, the cache will have at most one entry in production. In tests with multiple secrets (e.g., `crypto.test.ts` uses `TEST_SECRET` and `"wrong-key-..."`), the cache will have two entries.

Security note: the cache holds the derived key in memory, but the derived key was already held in memory for the duration of each encrypt/decrypt call. The risk profile does not change.

## Acceptance checks

- [ ] `keyBuffer` (or equivalent) derives the key at most once per unique secret value per process invocation
- [ ] `encrypt` and `decrypt` still work correctly for all inputs (existing tests must pass)
- [ ] A test or benchmark demonstrates that listing 10+ data sources does not linearly scale in wall-clock time with the number of rows (i.e., the scrypt cost is not O(n))
- [ ] The cache does not grow unboundedly (in production there is only one secret, but a test with a bounded cache or a WeakRef strategy is acceptable)

## Debate

*(empty — no author response yet)*

## Final resolution

**Cycle 5 Gatekeeper verification (2026-03-09):**

The fix is correctly implemented. `crypto.ts` lines 20–35 show a module-level `Map<string, Buffer>` with a cache-before-derive pattern. The fix is safe:
- The cached `Buffer` is not mutated by `createCipheriv` (Node.js copies the key internally).
- In production the Map holds exactly one entry (single `SECRET_KEY`).
- In tests the Map holds 2–3 entries (TEST_SECRET plus the wrong-key variant). Not a concern.

Acceptance criteria review:
- AC1 (derives key at most once): met in code, not proven in tests. See PG-080.
- AC2 (correctness): met — 8 passing tests including 10-call round-trip.
- AC3 (O(1) scrypt cost test/benchmark): NOT MET — the round-trip test only checks correctness, not call count. A regression that removes the cache would not be caught. Tracked as PG-080.
- AC4 (cache does not grow unboundedly): no size cap exists; acceptable given single-secret production use.

Ticket status confirmed: **fixed** for the correctness/performance regression. AC3 gap tracked as PG-080 (low severity).
