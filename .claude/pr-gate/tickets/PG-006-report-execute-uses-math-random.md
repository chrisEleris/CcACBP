# PG-006: Report execution stub uses Math.random() for persisted rowCount/durationMs

**Severity:** low
**Status:** open
**Created:** 2026-03-07
**Reviewed head:** c6f6f628ce56aaa77d54b08f44df49a9db316256

---

## Summary

`POST /api/reports/:id/execute` in `src/server/routes/reports.ts` inserts a `report_executions` row with `rowCount` and `durationMs` derived from `Math.random()`. These stub values are written to the database and returned to the client. Tests cannot assert on their values, and the `status` is stored as `"mock"` — a value not in the documented schema comment (`"running" | "completed" | "failed"`).

---

## Evidence

`src/server/routes/reports.ts` lines 172-188:
```typescript
const rowCount = Math.floor(Math.random() * 1000) + 1;
const durationMs = Math.floor(Math.random() * 2000) + 50;
// ...
  status: "mock",
```

`src/server/db/schema.ts` line 44: `status TEXT NOT NULL, // "running" | "completed" | "failed"` — `"mock"` is not listed.

---

## Why this matters

1. **Schema contract violation**: `"mock"` is not a valid status per the schema comment. If the status enum is later enforced (via a CHECK constraint or application logic), existing rows with `"mock"` would fail.
2. **Non-deterministic data in the database**: `Math.random()` values persist in `report_executions`. The executions list displayed to users shows random row counts and durations that change between runs of the same report.
3. **Test brittleness**: Tests for this endpoint cannot assert exact values, reducing their diagnostic value.

---

## Proposed fix

Use fixed stub values for the mock implementation:
```typescript
const rowCount = 0;
const durationMs = 0;
// ...
status: "completed",  // or use a valid enum value
```

Or add `"mock"` to the documented valid values in the schema comment if this status is intentional.

---

## Acceptance checks

- [ ] `status` value is in `{ "running", "completed", "failed" }` or schema comment is updated to include `"mock"` explicitly
- [ ] `rowCount` and `durationMs` are deterministic for the stub response (or not persisted)

---

## Debate

*(empty — awaiting author response if disputed)*

---

## Final resolution

*(pending)*
