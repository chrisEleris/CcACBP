# PG-003: scheduledReports table missing from Drizzle schema object passed to drizzle()

**Severity:** medium
**Status:** fixed
**Created:** 2026-03-07
**Reviewed head:** c6f6f628ce56aaa77d54b08f44df49a9db316256
**Fixed head:** e209175cbd0517f429254adc07dd6e8e7459350e

---

## Summary

`src/server/db/index.ts` passes `* as schema from "./schema"` to `drizzle(client, { schema })`. The `scheduledReports` table is defined in a separate file `src/server/db/schema-scheduled.ts` and is not included in the schema object. This means Drizzle ORM's relational query API (`db.query.*`) cannot access `scheduledReports`, and any future attempt to use `db.query.scheduledReports` will fail at runtime. Additionally, it creates an architectural inconsistency — one table lives outside the canonical schema file with no documented reason.

---

## Evidence

- `src/server/db/index.ts` line 5: `import * as schema from "./schema"` — only imports `./schema`.
- `src/server/db/schema-scheduled.ts` contains `scheduledReports`, `ScheduledReport`, `NewScheduledReport` as a standalone file.
- `src/server/routes/scheduled-reports.ts` line 7: imports `scheduledReports` directly from `../db/schema-scheduled`.
- The `drizzle()` call at `src/server/db/index.ts` line 14 receives a schema object that does not contain `scheduledReports`.

---

## Why this matters

1. **Relational API breakage**: If any code (current or future) calls `db.query.scheduledReports`, it fails silently or throws because the table is not registered with the Drizzle instance.
2. **Maintainability**: Future developers who follow the pattern of adding tables to `schema.ts` may not realize the split, or may add new split files and compound the problem.
3. **Type inference**: Drizzle's `db.$inferSelect` and type helpers for the overall DB type will not include `scheduledReports`.

---

## Proposed fix

Option A (preferred): Move the `scheduledReports` table definition into `src/server/db/schema.ts` and delete `schema-scheduled.ts`. Update imports in `scheduled-reports.ts`.

Option B: Keep `schema-scheduled.ts` and re-export it through `schema.ts`:
```typescript
// in schema.ts
export * from "./schema-scheduled";
```

Either way, the drizzle instance should see all tables.

---

## Acceptance checks

- [x] `db/index.ts` schema object includes `scheduledReports`
- [x] `db.query.scheduledReports` resolves correctly at the type level
- [x] All scheduled-reports tests still pass

---

## Debate

*(empty — awaiting author response if disputed)*

---

## Final resolution

`src/server/db/index.ts` now imports `* as scheduledSchema from "./schema-scheduled"` and merges it: `const allSchema = { ...schema, ...scheduledSchema }`. Both schema objects are passed to `drizzle(client, { schema: allSchema })`, so `db.query.scheduledReports` is now correctly registered with the Drizzle instance.
