# PG-002: Timing side-channel leaks API key length in safeCompare

**Severity:** medium
**Status:** fixed
**Created:** 2026-03-07
**Reviewed head:** c6f6f628ce56aaa77d54b08f44df49a9db316256
**Fixed head:** e209175cbd0517f429254adc07dd6e8e7459350e

---

## Summary

`safeCompare` in `src/server/middleware/auth.ts` short-circuits on length mismatch (`a.length !== b.length`) and returns false immediately after a dummy comparison. The short-circuit itself is a timing signal: a probe key with the same length as the real API key takes measurably longer (goes through `timingSafeEqual`) than one with a different length. This leaks whether a guessed key length matches the real key length.

---

## Evidence

`src/server/middleware/auth.ts` lines 8-15:

```typescript
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    const buf = Buffer.from(a);
    timingSafeEqual(buf, buf);  // burns time proportional to a.length, not b.length
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

When lengths differ, `timingSafeEqual(buf, buf)` runs for `a.length` bytes — the **attacker-controlled** length. When an attacker sends a key equal in length to the real API key, this branch is skipped and execution enters the real comparison branch. The difference is measurable if the server is local or on a low-latency network. An attacker can binary-search the key length in ~log2(N) probes.

---

## Why this matters

Knowing the API key length reduces the brute-force search space significantly. For a 32-character hex key, leaking length reduces effort from 16^1 through 16^64 to a single known length. This is a standard timing oracle vulnerability.

The correct approach is to HMAC-pad or hash both sides to a fixed length before comparison, or use a constant-time hash comparison regardless of length.

---

## Proposed fix

Replace the current implementation with HMAC-based constant-time comparison:

```typescript
import { createHmac, timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  // Hash both with a random per-request nonce to prevent length oracle
  // OR: use fixed-length HMAC to normalize both values
  const key = crypto.randomBytes(32);
  const ha = createHmac("sha256", key).update(a).digest();
  const hb = createHmac("sha256", key).update(b).digest();
  return timingSafeEqual(ha, hb);
}
```

This normalizes both inputs to 32 bytes regardless of length, eliminating the length oracle.

---

## Acceptance checks

- [x] `safeCompare` no longer branches on `a.length !== b.length` in a way that produces measurable timing differences
- [x] Both inputs are normalized to equal-length buffers before `timingSafeEqual`
- [x] Existing auth tests still pass

---

## Debate

*(empty — awaiting author response if disputed)*

---

## Final resolution

`safeCompare` in `src/server/middleware/auth.ts` now pads both buffers to `maxLen = Math.max(bufA.length, bufB.length)` before calling `timingSafeEqual`, then always returns `false` when original lengths differ. The comparison always runs for the same number of bytes regardless of which string is shorter, eliminating the length-based timing oracle.
