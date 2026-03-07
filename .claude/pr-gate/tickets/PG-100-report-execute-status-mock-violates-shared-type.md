# PG-100: report execute status "mock" violates the shared ReportExecutionStatus type

**Severity:** high
**Status:** open
**Created:** 2026-03-07
**Reviewed head:** 101a95ad9038035055daa9743ac1dd56f9660755

---

## Summary

`POST /api/reports/:id/execute` inserts an execution record with `status: "mock"`. The shared type `ReportExecutionStatus` in `src/shared/types.ts` only allows `"running" | "completed" | "failed"`. The client's `ExecutionRecord` type in `ReportViewerPage.tsx` mirrors the same three values. The database column comment also says `"running" | "completed" | "failed"`.

Storing `"mock"` creates an untyped database value. When the client reads that value and maps it through `executionStatusConfig` (which is keyed on `"completed" | "failed" | "running"`), any execution with status `"mock"` will produce a `statusConf = undefined`, causing a runtime crash: `TypeError: Cannot read properties of undefined (reading 'label')`.

---

## Evidence

- `src/shared/types.ts` line 436: `export type ReportExecutionStatus = "running" | "completed" | "failed";`
- `src/server/routes/reports.ts` lines 182-183:
  ```ts
  status: "mock",
  ```
- `src/client/pages/ReportViewerPage.tsx` lines 62-78: `executionStatusConfig` is typed as `Record<ExecutionRecord["status"], ...>` where `ExecutionRecord["status"]` is `"running" | "completed" | "failed"`.
- `src/client/pages/ReportViewerPage.tsx` lines 217-218:
  ```ts
  const statusConf = executionStatusConfig[exec.status];
  ```
  If `exec.status === "mock"`, `statusConf` is `undefined` and line 222 (`${statusConf.className}`) throws.
- `src/server/db/schema.ts` line 45: comment says `"running" | "completed" | "failed"`.

---

## Why this matters

This is a data integrity issue and a runtime crash path. Any report executed via the stub endpoint will persist `"mock"` to the database. Once stored, rendering that execution in the client throws a crash with no error boundary in `ReportViewerPage`. TypeScript does not catch this because the server inserts a string literal that TypeScript cannot check against the client's type at compile time.

---

## Proposed fix

Change the stub status to `"completed"` so it matches the documented type:

```ts
status: "completed",
```

Update `src/server/db/schema.ts` comment to reference the shared type. Optionally add a defensive guard in `ReportViewerPage` before accessing `statusConf`.

---

## Acceptance checks

- [ ] `src/server/routes/reports.ts` no longer inserts `status: "mock"`.
- [ ] The inserted status is one of `"running" | "completed" | "failed"`.
- [ ] `executionStatusConfig` lookup in `ReportViewerPage` cannot produce `undefined` for any persisted row.
- [ ] Test in `tests/server/reports.test.ts` at line 84 (`expect(body.data.status).toBe("mock")`) is updated to match the new value.

---

## Debate

*(empty)*

---

## Final resolution

*(pending)*
