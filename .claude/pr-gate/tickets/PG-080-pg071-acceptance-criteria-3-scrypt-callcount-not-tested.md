---
id: PG-080
title: PG-071 fix — AC3 not met: no test verifies scryptSync is called once not N times
severity: low
status: open
files: [src/server/lib/crypto.ts, tests/server/crypto.test.ts]
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

The fix for PG-071 added a memoization cache to `keyBuffer()` so that `scryptSync` runs at most once per unique secret per process lifetime. The implementation is correct. However, PG-071's third acceptance criterion requires "a test or benchmark that demonstrates that listing 10+ data sources does not linearly scale in wall-clock time with the number of rows (i.e., the scrypt cost is not O(n))". The added test only asserts round-trip correctness — it does not verify that `scryptSync` was called exactly once for N calls with the same key.

## Evidence

PG-071 acceptance check (from ticket):
```
- [ ] A test or benchmark demonstrates that listing 10+ data sources does not
      linearly scale in wall-clock time with the number of rows (i.e., the
      scrypt cost is not O(n))
```

The added test at `tests/server/crypto.test.ts` lines 60–65:
```typescript
it("multiple encrypt/decrypt calls with the same key all round-trip correctly (PG-071 cache)", () => {
  const inputs = Array.from({ length: 10 }, (_, i) => `plaintext-value-${i}`);
  const ciphertexts = inputs.map((p) => encrypt(p, TEST_SECRET));
  const decrypted = ciphertexts.map((c) => decrypt(c, TEST_SECRET));
  expect(decrypted).toEqual(inputs);
});
```

This test verifies that `encrypt` and `decrypt` produce correct results when called 10 times with the same key. It does NOT:
- Spy on `scryptSync` to count the number of invocations
- Assert that `scryptSync` was called exactly once (not 20 times)
- Measure wall-clock time to confirm O(1) not O(n) behavior

If someone accidentally reverted the cache (e.g., removed the `Map` and the early return), this test would still pass — it would just be slow. The regression would not be caught by this test.

## Why this matters

The purpose of the cache fix is to prevent O(n) event-loop blocking. If a future refactor breaks the cache (e.g., moving `keyBuffer` inline, renaming the function, accidentally creating a new Map per call), the correctness test would still pass while the performance regression would be silently re-introduced. The acceptance criterion explicitly called for a test that demonstrates the O(1) property.

This is a test quality gap: the behavior that was fixed is not the behavior that is tested.

## Proposed fix

Add a spy on `scryptSync` (via `vi.spyOn`) to verify it is called exactly once regardless of how many `encrypt`/`decrypt` calls are made with the same key:

```typescript
import { describe, expect, it, vi } from "vitest";
import * as nodeCrypto from "node:crypto";

it("scryptSync is called at most once per unique secret (PG-071 cache)", () => {
  const spy = vi.spyOn(nodeCrypto, "scryptSync");
  // Reset spy count; note: module-level cache may already be warm from prior tests
  // Use a fresh unique secret to guarantee a cache miss on first call
  const freshSecret = `unique-secret-for-spy-test-${Date.now()}`;
  spy.mockImplementation(nodeCrypto.scryptSync); // passthrough

  encrypt("value1", freshSecret);
  encrypt("value2", freshSecret);
  encrypt("value3", freshSecret);
  decrypt(encrypt("value4", freshSecret), freshSecret);

  // scryptSync should have been called exactly once (first call with freshSecret)
  const callsForSecret = spy.mock.calls.filter((args) => args[0] === freshSecret);
  expect(callsForSecret.length).toBe(1);

  spy.mockRestore();
});
```

Alternatively, the `derivedKeyCache` could be exported (even just for test introspection), allowing a test to verify cache size growth.

## Acceptance checks

- [ ] A test exists that verifies `scryptSync` is invoked exactly once for N > 1 calls with the same secret
- [ ] If the cache is accidentally removed, this test fails
- [ ] Existing crypto tests continue to pass

## Debate

*(empty — no author response yet)*

## Final resolution

*(pending)*
