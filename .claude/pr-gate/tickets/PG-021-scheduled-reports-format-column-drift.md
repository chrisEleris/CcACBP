---
id: PG-021
title: schema-scheduled.ts format column allows only json/csv but route accepts pdf/xlsx
severity: low
status: open
files:
  - src/server/db/schema-scheduled.ts
  - src/server/routes/scheduled-reports.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`src/server/db/schema-scheduled.ts` has a comment `// "json" | "csv"` suggesting only two formats, while the route's Zod schema in `scheduled-reports.ts` accepts `"json" | "csv" | "pdf" | "xlsx"` (four formats). The database schema comment is out of date. The discrepancy means stored format values `"pdf"` and `"xlsx"` are not reflected in the schema documentation.

## Evidence

- `src/server/db/schema-scheduled.ts:9` — `format: text("format").notNull().default("json"), // "json" | "csv"` — comment lists only 2 values.
- `src/server/routes/scheduled-reports.ts:32` — `format: z.enum(["json", "csv", "pdf", "xlsx"])` — accepts 4 values.
- `tests/server/scheduled-reports.test.ts:311-324` — test verifies all 4 formats are accepted and stored.

## Why this matters

Schema comments that disagree with actual usage create confusion for developers reading the code. A developer seeing the schema comment might incorrectly add a `CHECK(format IN ('json','csv'))` constraint that would reject valid stored `"pdf"` values. This is a documentation drift issue.

## Proposed fix

Update `schema-scheduled.ts` line 9 comment to reflect all 4 accepted values:
```ts
format: text("format").notNull().default("json"), // "json" | "csv" | "pdf" | "xlsx"
```

Optionally add a `CHECK` constraint matching the Zod enum.

## Acceptance checks

- [ ] Schema comment matches the route's Zod enum exactly.
- [ ] If a CHECK constraint is added, all 4 formats pass and invalid formats are rejected.

## Debate

### Gatekeeper claim

The schema comment is factually wrong — it documents 2 formats but 4 are stored. Documentation drift creates maintenance hazards.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
