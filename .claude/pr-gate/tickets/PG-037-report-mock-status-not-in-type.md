---
id: PG-037
title: report_executions.status stores undocumented "mock" value not in type system
severity: low
status: open
files: [src/server/routes/reports.ts, src/shared/types.ts]
created_by: principal-engineer
updated_by: principal-engineer
---

## Summary

Stub report execution inserts `status: "mock"` but `ReportExecutionStatus` type defines only `"running" | "completed" | "failed"`. This creates a fourth undocumented state in the database.

## Evidence

- `src/server/routes/reports.ts:181` — `status: "mock"` inserted
- `src/shared/types.ts` — `ReportExecutionStatus` type doesn't include "mock"

## Why this matters

- Type system violation — DB contains values not in the type
- Client may not handle unknown status values correctly
- No CHECK constraint on the column

## Proposed fix

Use `status: "completed"` for stub executions. The existing `mock: true` response field already signals mock nature.

## Acceptance checks

- [ ] No "mock" status value written to database
- [ ] Type system accurately represents all possible status values
- [ ] Tests updated if needed

## Debate

### Gatekeeper claim

Type system should match reality. The existing `mock: true` field is the proper signaling mechanism.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
