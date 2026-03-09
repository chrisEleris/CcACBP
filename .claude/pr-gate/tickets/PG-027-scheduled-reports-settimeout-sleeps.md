---
id: PG-027
title: scheduled-reports.test.ts uses 8 real setTimeout sleeps violating project standards
severity: medium
status: open
files: [tests/server/scheduled-reports.test.ts]
created_by: qa-engineer
updated_by: qa-engineer
---

## Summary

`tests/server/scheduled-reports.test.ts` uses eight real `setTimeout` sleeps (20-50ms each) to force timestamp ordering in SQLite. CLAUDE.md standards prohibit sleeping in tests.

## Evidence

- `tests/server/scheduled-reports.test.ts:162,165,515,843,873,880,975,980` — `await new Promise(resolve => setTimeout(resolve, N))` calls
- CLAUDE.md states "No sleeping in tests (use mocks)"

## Why this matters

- Violates project coding standards
- Adds unnecessary wall-clock time to test suite
- Fragile: timing-dependent tests can flake under system load

## Proposed fix

Replace `setTimeout` sleeps with `vi.useFakeTimers()` and `vi.advanceTimersByTime()` where ordering constraint is on wall-clock timestamps. Where constraint is on SQLite `CURRENT_TIMESTAMP`, use `vi.setSystemTime()` before each insertion.

## Acceptance checks

- [ ] No real `setTimeout` sleeps in test file
- [ ] Tests use fake timers or `vi.setSystemTime()`
- [ ] All tests still pass
- [ ] Execution time reduced

## Debate

### Gatekeeper claim

Standards violation with a clear fix path.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
