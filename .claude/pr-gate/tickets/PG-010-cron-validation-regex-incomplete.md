---
id: PG-010
title: Cron expression validation regex permits invalid values like minute=99 or month=99
severity: medium
status: fixed
files:
  - src/server/routes/scheduled-reports.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

The `CRON_FIELD` regex and `cronExpression` Zod refine validator in `scheduled-reports.ts` only checks the structural format of cron fields (that each field looks like a number, range, list, or step pattern). It does not validate that the numeric values are within legal ranges for their respective fields (minute 0–59, hour 0–23, day 1–31, month 1–12, weekday 0–7). A cron expression like `"99 99 99 99 99"` passes validation.

## Evidence

- `src/server/routes/scheduled-reports.ts:15` — `CRON_FIELD = /^(\*|[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*)(\/[0-9]+)?$/` — this only checks that numbers appear in the right positions, not that they are in range.
- `src/server/routes/scheduled-reports.ts:17-26` — the `cronExpression` validator checks field count (5 or 6) and that each field matches `CRON_FIELD`, but does not parse or range-check any numeric value.
- The test at `tests/server/scheduled-reports.test.ts:389-400` verifies that `"not a valid cron"` is rejected (which it is), but no test verifies that `"99 99 99 99 99"` is rejected (it is not).

## Why this matters

A scheduler or cron parsing library that receives `"99 99 99 99 99"` will either silently ignore it, error at runtime, or produce undefined behavior. When the scheduled report execution is implemented, invalid cron expressions stored in the database will cause runtime failures that are difficult to diagnose. Storing semantically invalid cron strings is a data quality issue.

## Proposed fix

Add range checks to each of the 5 standard cron fields after the structural validation:
- Field 0 (minute): 0–59
- Field 1 (hour): 0–23
- Field 2 (day of month): 1–31
- Field 3 (month): 1–12
- Field 4 (weekday): 0–7

A lightweight approach is to use a well-tested cron parsing library (e.g., `cron-parser`) and wrap it in the Zod refine:
```ts
const cronExpression = z.string().min(1).refine(
  (val) => { try { CronParser.parseExpression(val); return true; } catch { return false; } },
  { message: "Invalid cron expression" }
);
```

Or implement range validation inline for the simple 5-field case.

## Acceptance checks

- [ ] `"99 99 99 99 99"` returns 400 when submitted to `POST /api/scheduled-reports`.
- [ ] `"*/15 * * * *"` (every 15 minutes) is accepted.
- [ ] `"0 9 * * 1-5"` (weekdays at 9am) is accepted.
- [ ] Test cases for out-of-range values added.

## Debate

### Gatekeeper claim

The current regex is structural only — it does not reject `"99 99 99 99 99"`. When cron execution is implemented, silently stored invalid cron strings will cause runtime failures.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
