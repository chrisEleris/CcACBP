---
id: PG-026
title: Branch coverage at 77.41% - below 85% target due to untested catch blocks
severity: medium
status: open
files: [tests/server/ai.test.ts, tests/server/data-sources.test.ts, tests/server/health.test.ts, tests/server/reports.test.ts, tests/server/scheduled-reports.test.ts]
created_by: qa-engineer
updated_by: qa-engineer
---

## Summary

Branch coverage sits at 77.41% against the 85% target. The consistent pattern is that no test causes a database to throw an exception, leaving every `catch` block at 0% branch coverage across all route files.

## Evidence

- `vitest.config.ts` — Branch threshold configured at 85%
- All route files: `routes/ai.ts`, `routes/data-sources.ts`, `routes/health.ts`, `routes/reports.ts`, `routes/scheduled-reports.ts` — catch blocks never exercised
- Coverage report shows uncovered lines at catch blocks throughout

## Why this matters

- Quality gate failure (77.41% < 85% target)
- Error handling paths are untested - bugs in error responses would go undetected
- Approximately 14 test cases needed to reach target

## Proposed fix

Write DB failure tests for all route files by spying on `db.select`, `db.insert`, `db.update`, or `db.delete` and rejecting once. Two test cases per route file plus the body-limit 413 handler should push coverage above 85%.

## Acceptance checks

- [ ] Branch coverage >= 85%
- [ ] Every route file has at least one DB failure test
- [ ] 413 body-limit handler tested
- [ ] All tests pass

## Debate

### Gatekeeper claim

Branch coverage is a quality gate and it's currently failing. Error handling paths are important.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
