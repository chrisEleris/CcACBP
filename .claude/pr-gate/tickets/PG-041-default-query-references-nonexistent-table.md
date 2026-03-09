---
id: PG-041
title: Default query references non-existent users table
severity: low
status: open
files: [src/client/pages/QueryExplorerPage.tsx, src/client/pages/ReportBuilderPage.tsx]
created_by: principal-engineer
updated_by: principal-engineer
---

## Summary

Both QueryExplorerPage and ReportBuilderPage default to `SELECT * FROM users LIMIT 100;` but the database has no `users` table. When real execution is wired, the first-run experience will be an error.

## Evidence

- `src/client/pages/QueryExplorerPage.tsx:43` — Default query references `users` table
- `src/client/pages/ReportBuilderPage.tsx:63` — Same default query
- No `users` table in `schema.ts` or `schema-scheduled.ts`

## Why this matters

- Bad first-run experience when real SQL execution is implemented
- Confusing error for new users

## Proposed fix

Change default to: `SELECT name, type FROM sqlite_master WHERE type = 'table' ORDER BY name;`

## Acceptance checks

- [ ] Default queries reference existing tables
- [ ] First-run experience shows meaningful results

## Debate

### Gatekeeper claim

Default queries should work out of the box.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
