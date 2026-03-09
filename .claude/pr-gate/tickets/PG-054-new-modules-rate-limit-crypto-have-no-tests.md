---
id: PG-054
title: New rate-limit and crypto modules introduced with zero test coverage
severity: medium
status: fixed
files:
  - src/server/middleware/rate-limit.ts
  - src/server/lib/crypto.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

Two new modules were added as part of the security fixes for PG-020 (rate limiting) and PG-014 (credential encryption): `src/server/middleware/rate-limit.ts` and `src/server/lib/crypto.ts`. Neither file has any unit tests in the `tests/` directory. The `data-sources.test.ts` file does not test encryption or decryption behavior at all.

## Evidence

- `tests/server/` contains no file matching `rate-limit*` or `crypto*`.
- `grep -rn "rateLimit|rate-limit|encrypt|decrypt|crypto" tests/` returns no results.
- `tests/server/data-sources.test.ts` does not import or reference `encryptConfig`, `decryptConfig`, `encrypt`, or `decrypt`.
- `src/server/middleware/rate-limit.ts` — new file, no tests.
- `src/server/lib/crypto.ts` — new file, no tests.

The project's `CLAUDE.md` specifies mandatory TDD and 80% minimum statement coverage (90% target). Both modules were introduced without following that process.

## Why this matters

### Rate limiter
The rate limiter has a non-trivial reset logic (window-based with lazy eviction). Without tests it is unclear whether:
- The counter resets correctly after `windowMs` elapses.
- The 429 response includes `Retry-After` with the correct value.
- The middleware correctly passes requests within the limit.
- Behavior is correct when `x-forwarded-for` contains multiple comma-separated IPs.

### Crypto module
`encrypt`/`decrypt` are the sole protection for stored credentials. Without tests:
- Round-trip correctness is unverified (no test that `decrypt(encrypt(x, key), key) === x`).
- Tampered ciphertext behavior is unverified (GCM auth tag rejection).
- Edge cases (empty string, non-ASCII characters, very long strings) are untested.
- Key mismatch behavior is unverified (wrong key should throw, not silently return garbage).

The `data-sources.test.ts` integration tests run against an in-memory SQLite without `SECRET_KEY` set, meaning `encryptConfig` returns plaintext and `decryptConfig` is never exercised through the test suite.

## Proposed fix

1. Create `tests/server/rate-limit.test.ts` covering:
   - Requests within limit pass (200).
   - Requests exceeding limit return 429.
   - `Retry-After` header is present and positive.
   - Counter resets after `windowMs`.
   - Multiple IPs are tracked independently.

2. Create `tests/server/crypto.test.ts` covering:
   - `encrypt`/`decrypt` round-trip with various payloads.
   - Wrong key throws on decryption (GCM auth tag failure).
   - Tampered ciphertext throws.
   - Minimum-length encoded blob validation.

## Acceptance checks

- [ ] `tests/server/rate-limit.test.ts` exists and passes.
- [ ] `tests/server/crypto.test.ts` exists and passes with at least 5 distinct test cases.
- [ ] Coverage report shows rate-limit.ts and crypto.ts at ≥ 80% statement coverage.

## Debate

_Not yet provided._

## Final resolution

Pending.
