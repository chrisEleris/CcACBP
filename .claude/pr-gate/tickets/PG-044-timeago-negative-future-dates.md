---
id: PG-044
title: timeAgo returns negative strings like "-5m ago" for future dates
severity: low
status: open
files: [src/client/utils/time.ts]
created_by: principal-engineer
updated_by: principal-engineer
---

## Summary

If `dateStr` is in the future (e.g., `nextRunAt` on a scheduled report), `diff` is negative and the function returns strings like `-5m ago`.

## Evidence

- `src/client/utils/time.ts:4-13` — No guard for negative diff values
- `nextRunAt` field on scheduled reports can be in the future

## Why this matters

- Displays nonsensical time strings to users
- No test covers this case

## Proposed fix

Add `if (diff < 0) return "in the future";` as first guard. Add test case.

## Acceptance checks

- [ ] Future dates return readable string
- [ ] Test case for negative diff added
- [ ] Existing tests pass

## Debate

### Gatekeeper claim

Edge case with visible user impact.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
