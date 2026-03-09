---
id: PG-034
title: Schema duplicated between migrate.ts raw SQL and Drizzle schema files
severity: medium
status: open
files: [src/server/db/migrate.ts, src/server/db/schema.ts, src/server/db/schema-scheduled.ts]
created_by: principal-engineer
updated_by: principal-engineer
---

## Summary

`migrate.ts` contains 113 lines of raw SQL that manually replicates every table definition already expressed in the Drizzle schema files. Two sources of truth will diverge. The split between `schema.ts` and `schema-scheduled.ts` compounds this.

## Evidence

- `src/server/db/migrate.ts` — Full raw SQL schema duplication
- `src/server/db/schema.ts` — Drizzle schema definitions
- `src/server/db/schema-scheduled.ts` — Separate Drizzle schema file

## Why this matters

- Dev/test environments (using `initializeSchema`) will silently diverge from production (using `drizzle-kit migrate`)
- Any schema change requires updating two places
- Error-prone maintenance burden

## Proposed fix

Remove `migrate.ts` and `initializeSchema`. Use `drizzle-kit push` for dev/test. Consolidate `schema-scheduled.ts` into `schema.ts`.

## Acceptance checks

- [ ] Single source of truth for schema
- [ ] Dev/test/prod use same schema definitions
- [ ] All tests pass after consolidation

## Debate

### Gatekeeper claim

Dual schema maintenance is a known source of bugs and divergence.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
