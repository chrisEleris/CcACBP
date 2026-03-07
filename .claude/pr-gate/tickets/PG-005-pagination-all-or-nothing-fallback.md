# PG-005: Pagination fallback resets valid offset when only limit is invalid

**Severity:** low
**Status:** open
**Created:** 2026-03-07
**Reviewed head:** c6f6f628ce56aaa77d54b08f44df49a9db316256

---

## Summary

`parsePagination` in `src/server/lib/pagination.ts` uses a single `paginationSchema.safeParse(raw)` call over both `limit` and `offset` together. If `limit` fails validation (e.g. `limit=999` exceeds `MAX_LIMIT=200`) but `offset` is valid, the entire parse fails and both values fall back to defaults. A legitimate client sending `?limit=999&offset=100` would receive page 1 (offset=0) instead of an error or the clamped limit with the requested offset.

---

## Evidence

`src/server/lib/pagination.ts` lines 8-43:
- `z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)` — `.max(MAX_LIMIT)` causes validation failure rather than clamping.
- `result.success` false → returns `{ limit: DEFAULT_LIMIT, offset: DEFAULT_OFFSET }` unconditionally.

`tests/server/pagination.test.ts` lines 91-107: the test `"falls back to defaults when limit exceeds 200"` passes `limit: "201"` with no offset and asserts `offset: 0`. There is no test for `limit=201` with `offset=100`.

---

## Why this matters

If a client increments through pages (`offset=0, 50, 100, ...`) and accidentally sends an out-of-range limit once, it silently jumps back to page 1. This is confusing UX and harder to debug since no error is returned.

---

## Proposed fix

Two options:

**Option A — Clamp instead of fail:**
```typescript
limit: z.coerce.number().int().min(1).default(DEFAULT_LIMIT)
  .transform((v) => Math.min(v, MAX_LIMIT)),
```
This lets the limit be silently capped but preserves the offset.

**Option B — Parse fields independently:**
```typescript
export function parsePagination(c: Context): Pagination {
  const rawLimit = c.req.query("limit");
  const rawOffset = c.req.query("offset");

  const limitResult = z.coerce.number().int().min(1).max(MAX_LIMIT)
    .default(DEFAULT_LIMIT).safeParse(rawLimit);
  const offsetResult = z.coerce.number().int().min(0)
    .default(DEFAULT_OFFSET).safeParse(rawOffset);

  return {
    limit: limitResult.success ? limitResult.data : DEFAULT_LIMIT,
    offset: offsetResult.success ? offsetResult.data : DEFAULT_OFFSET,
  };
}
```

---

## Acceptance checks

- [ ] A valid `offset` is preserved when only `limit` is invalid (or out of range)
- [ ] `parsePagination` test added for `limit=999&offset=100` → offset is not reset to 0
- [ ] Existing pagination tests still pass

---

## Debate

*(empty — awaiting author response if disputed)*

---

## Final resolution

*(pending)*
