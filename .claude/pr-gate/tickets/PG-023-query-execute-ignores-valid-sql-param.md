---
id: PG-023
title: POST /api/query/execute validates then ignores the sql field entirely
severity: low
status: open
files:
  - src/server/routes/query.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`POST /api/query/execute` validates the request body with `zValidator("json", executeQuerySchema)` to ensure the `sql` field is present and within size limits, then immediately ignores the validated value. `c.req.valid("json")` is called at line 63 but its return value is discarded. The stub always returns the same hardcoded rows regardless of what SQL was submitted.

## Evidence

- `src/server/routes/query.ts:61-87`:
  ```ts
  .post("/execute", zValidator("json", executeQuerySchema), async (c) => {
    try {
      c.req.valid("json");  // return value discarded
      // Stub: returns mock data
      return c.json({ data: { columns: [...], rows: [...], rowCount: 3, durationMs: 42, mock: true } });
  ```
- `src/server/routes/query.ts:63` — `c.req.valid("json")` is called for side effects only (to satisfy the validator), but the destructured value is unused.

## Why this matters

This is an inconsistency that will surprise developers implementing the real query execution. The validated `sql` value must be destructured and used. The current pattern suggests the validated input has been read when it has not. When real execution is added, a developer may overlook this line and not pass the validated SQL to the execution engine, accidentally using `c.req.raw` or another source.

## Proposed fix

Change line 63 to:
```ts
const { sql: queryText, dataSourceId } = c.req.valid("json");
```
And add a comment that these will be passed to the real execution engine when implemented. This makes the code self-documenting and prevents the "re-fetch input from request" mistake when the stub is replaced.

## Acceptance checks

- [ ] The validated `sql` and `dataSourceId` fields are destructured and named, even if unused in the stub.
- [ ] A comment documents which variables will be used by the real execution engine.
- [ ] Tests still pass.

## Debate

### Gatekeeper claim

Discarding the return value of `c.req.valid("json")` silently ignores the validated input. This is a dead-code pattern that will cause a subtle bug when the stub is replaced.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
