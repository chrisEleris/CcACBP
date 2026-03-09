---
id: PG-033
title: safeCompare leaks API key length via timing side channel
severity: high
status: fixed
files: [src/server/middleware/auth.ts]
created_by: principal-engineer
updated_by: principal-engineer
---

## Summary

The `safeCompare` function short-circuits on length mismatch before running `timingSafeEqual`. Additionally, `timingSafeEqual(buf, buf)` self-comparison completes faster than cross-buffer comparison. An attacker with high-precision timing can enumerate the correct key length.

## Evidence

- `src/server/middleware/auth.ts:8-16` — Length check before `timingSafeEqual`
- Self-comparison used as fallback: `timingSafeEqual(buf, buf)`

## Why this matters

Timing side channels can be exploited to determine API key length, reducing the search space for brute force attacks.

## Proposed fix

Hash both inputs to fixed-length digests before comparison:
```typescript
import { timingSafeEqual, createHmac } from "node:crypto";
const HMAC_SALT = Buffer.alloc(32);
function safeCompare(a: string, b: string): boolean {
  const ha = createHmac("sha256", HMAC_SALT).update(a).digest();
  const hb = createHmac("sha256", HMAC_SALT).update(b).digest();
  return timingSafeEqual(ha, hb);
}
```

## Acceptance checks

- [ ] No length-based short-circuit in comparison
- [ ] Both inputs hashed to fixed-length before comparison
- [ ] Existing auth tests pass

## Debate

### Gatekeeper claim

Timing side channels are a real attack vector for API key authentication.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

**Cycle 6 Gatekeeper verification (2026-03-09):**

Fix confirmed present in `src/server/middleware/auth.ts`:

- Line 1: imports `createHmac` and `timingSafeEqual` from `node:crypto`.
- Line 8: `HMAC_SALT = Buffer.alloc(32)` — fixed 32-byte zero salt.
- Lines 17–21: `safeCompare` HMACs both inputs to fixed-length 32-byte digests before calling `timingSafeEqual`. No length-based short-circuit exists. Both inputs are digested regardless of whether they are equal.

The fix is the exact proposed solution from the ticket. All three acceptance criteria met. Status: **fixed**.
