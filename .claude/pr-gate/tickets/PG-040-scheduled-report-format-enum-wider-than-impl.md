---
id: PG-040
title: Scheduled report format enum accepts pdf/xlsx but no implementation exists
severity: low
status: open
files: [src/server/routes/scheduled-reports.ts, src/server/db/schema-scheduled.ts]
created_by: principal-engineer
updated_by: principal-engineer
---

## Summary

The route validator accepts `["json", "csv", "pdf", "xlsx"]` but no PDF or XLSX generation exists. Users creating scheduled reports with `format: "pdf"` get a successful 201 but no PDF will ever be produced.

## Evidence

- `src/server/routes/scheduled-reports.ts:33` — Accepts all four formats
- No PDF or XLSX generation code exists in the codebase

## Why this matters

- Silent failure for users expecting PDF/XLSX output
- Misleading API contract

## Proposed fix

Reduce enum to `["json", "csv"]` until those formats are implemented.

## Acceptance checks

- [ ] Validator only accepts implemented formats
- [ ] Tests updated for narrower enum

## Debate

### Gatekeeper claim

API should only accept values it can fulfill.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
