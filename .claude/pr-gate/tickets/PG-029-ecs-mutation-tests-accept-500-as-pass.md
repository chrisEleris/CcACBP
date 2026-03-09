---
id: PG-029
title: ECS mutation tests accept HTTP 500 as passing via dual-status assertions
severity: medium
status: open
files: [tests/server/ecs.test.ts]
created_by: qa-engineer
updated_by: qa-engineer
---

## Summary

ECS mutation endpoint tests use `expect([202, 500]).toContain(res.status)` assertions, meaning a test passes whether the route succeeds or throws an internal server error.

## Evidence

- `tests/server/ecs.test.ts` — Mutation tests use `expect([202, 500]).toContain(res.status)`
- This pattern makes tests incapable of detecting regressions where mutations always return 500

## Why this matters

- Tests provide no signal about whether mutation endpoints actually work
- A route returning 500 for every request would still pass all tests
- Defeats the purpose of having tests

## Proposed fix

After properly mocking AWS SDK clients (PG-025), update assertions to `expect(res.status).toBe(202)` for all mutation endpoints.

## Acceptance checks

- [ ] All ECS mutation tests assert exact expected status code
- [ ] No dual-status `[202, 500]` assertions remain
- [ ] Tests pass with mocked AWS responses

## Debate

### Gatekeeper claim

Dual-status assertions are vacuous - they verify nothing meaningful about the route behavior.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
