---
id: PG-008
title: Foreign key relationships declared in comments but not enforced in schema
severity: medium
status: fixed
files:
  - src/server/db/migrate.ts
  - src/server/db/schema.ts
  - src/server/db/schema-scheduled.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

Several tables have columns that logically reference other tables (`report_id`, `data_source_id`, `conversation_id`) but no `FOREIGN KEY` constraints are declared in the SQLite schema. The `PRAGMA foreign_keys = ON` is correctly set in `migrate.ts`, but only applies when `FOREIGN KEY` constraints exist — and they don't. The `scheduled-reports` route manually checks that the referenced report exists before inserting, but `report_executions` and `ai_messages` do not.

## Evidence

- `src/server/db/migrate.ts:8` — `PRAGMA foreign_keys = ON` is set, but:
- `src/server/db/migrate.ts:34-50` — `report_executions.report_id` references `saved_reports` but has no `REFERENCES saved_reports(id)` clause.
- `src/server/db/migrate.ts:56-65` — `ai_messages.conversation_id` references `ai_conversations` but has no `REFERENCES ai_conversations(id)` clause.
- `src/server/db/schema.ts:43` — comment says `"report_id TEXT NOT NULL"` without FK declaration.
- `src/server/db/schema-scheduled.ts:6` — `report_id TEXT NOT NULL` without FK declaration; the application-level check in `scheduled-reports.ts:93-97` compensates but this is not enforced at the DB level.

## Why this matters

Without declared FK constraints, the SQLite FK enforcement (`PRAGMA foreign_keys = ON`) has no effect. Orphaned `report_executions` records can exist after a report is deleted (the route handles this with a transaction, but direct DB access bypasses it). Orphaned `ai_messages` after conversation deletion is handled by the route transaction, but again only as application logic. Any direct DB access, test data setup, or background job that skips the application layer can create orphaned rows silently.

## Proposed fix

Add explicit `FOREIGN KEY` declarations to the migration SQL:
```sql
CREATE TABLE report_executions (
  ...
  report_id TEXT NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
  ...
);

CREATE TABLE ai_messages (
  ...
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  ...
);

CREATE TABLE scheduled_reports (
  ...
  report_id TEXT NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
  ...
);
```

The `ON DELETE CASCADE` matches the existing application-level cascade logic in the DELETE handlers.

## Acceptance checks

- [ ] Attempting to insert a `report_executions` row with a non-existent `report_id` fails with a FK constraint error.
- [ ] Deleting a report cascades to `report_executions` at the DB level, not just via application transaction.
- [ ] All existing tests pass (cascade behavior is already tested at the route level).

## Debate

### Gatekeeper claim

`PRAGMA foreign_keys = ON` without declared FK constraints is a no-op. The cascade logic currently lives only in application code (transactions in DELETE handlers), which is not enforced for out-of-band writes.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
