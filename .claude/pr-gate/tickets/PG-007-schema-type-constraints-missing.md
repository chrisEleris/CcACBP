---
id: PG-007
title: Database schema columns lack CHECK constraints for enum values stored as TEXT
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

Multiple columns that store typed enum values are declared as unconstrained `TEXT` in the SQLite schema, with no `CHECK` constraints enforcing allowed values. The Zod validation at the API layer protects the happy path, but direct database writes (tests, migrations, future internal code) can insert arbitrary strings. If Drizzle's ORM layer is bypassed, the database accumulates invalid data silently.

## Evidence

- `src/server/db/migrate.ts:16` — `type TEXT NOT NULL` for `data_sources` with no CHECK for `"cloudwatch" | "redshift" | "mysql" | "s3" | "csv"`.
- `src/server/db/migrate.ts:17` — `status TEXT NOT NULL DEFAULT 'disconnected'` with no CHECK for `"connected" | "disconnected" | "error"`.
- `src/server/db/migrate.ts:30` — `visualization TEXT NOT NULL DEFAULT 'table'` with no CHECK for valid viz types.
- `src/server/db/migrate.ts:38` — `status TEXT NOT NULL` for `report_executions` with no CHECK — currently `"mock"` is inserted (a value not in the `ReportExecutionStatus` type).
- `src/server/db/migrate.ts:63` — `agent_type TEXT NOT NULL DEFAULT 'general'` for `ai_conversations` with no CHECK.
- `src/server/db/schema.ts:9` — comments document the enum values but Drizzle's `text()` does not enforce them at the database level without explicit CHECK constraints.

## Why this matters

Drizzle ORM with SQLite does not enforce enum constraints at the database level by default. Any code path that bypasses Zod validation (test helpers, direct DB access, future background jobs) can insert invalid enum values. This creates silent data corruption and causes downstream code that switches on these values to hit unexpected states without a clear error.

The `report_executions.status` column already has a concrete instance: `"mock"` is inserted, which is not a value in the `ReportExecutionStatus` type (`"running" | "completed" | "failed"`).

## Proposed fix

1. Add `CHECK` constraints to the `CREATE TABLE` statements in `migrate.ts` for all enum-valued TEXT columns:
   ```sql
   status TEXT NOT NULL DEFAULT 'disconnected' CHECK(status IN ('connected','disconnected','error'))
   ```
2. Fix the `report_executions.status` inconsistency: either add `"mock"` to `ReportExecutionStatus` in `shared/types.ts`, or change the stub to use `"completed"` and add the CHECK constraint.
3. Update Drizzle schema definitions to use `.check()` or to document the constraint.

## Acceptance checks

- [ ] Inserting an invalid enum value via raw SQL to a constrained column returns a SQLite CHECK constraint error.
- [ ] `report_executions.status` is consistent between the TypeScript type and what the stub inserts.
- [ ] All existing tests pass after constraint additions.

## Debate

### Gatekeeper claim

The `"mock"` status value is a concrete type inconsistency. The absence of CHECK constraints allows silent corruption from any code path that bypasses the Zod layer.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
