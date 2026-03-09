---
id: PG-013
title: ECS and AWS routes excluded from coverage thresholds - actual mutations untested
severity: medium
status: open
files:
  - vitest.config.ts
  - tests/server/ecs-helpers.test.ts
  - tests/server/aws-helpers.test.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`vitest.config.ts` explicitly excludes `src/server/routes/aws.ts` and `src/server/routes/ecs.ts` from coverage thresholds. These two files contain the only live AWS SDK calls that mutate real infrastructure: `UpdateServiceCommand` (scale), `UpdateServiceCommand` (force deploy), and `StopTaskCommand`. The coverage exclusion means the threshold check does not enforce any test coverage for these code paths, and the comment acknowledges this as an intentional omission.

## Evidence

- `vitest.config.ts:32-35`:
  ```ts
  exclude: [
    "src/server/entry.ts",
    "src/server/routes/aws.ts",
    "src/server/routes/ecs.ts",
  ],
  ```
- Comment: "AWS SDK routes require real credentials for success paths; error handling and helper functions are tested separately".
- `tests/server/ecs-helpers.test.ts` and `tests/server/aws-helpers.test.ts` test the pure helper/resolver functions only, not the route handlers themselves.
- `src/server/routes/ecs.ts:311-365` — the three mutating endpoints (scale, deploy, stop) have no integration tests at all, not even mocked ones.

## Why this matters

The mutating ECS endpoints are the highest-risk routes in the application (they change live infrastructure). Excluding them from coverage thresholds means the 80% statement/function targets say nothing about these routes. The error paths (what happens when `UpdateServiceCommand` fails) are untested. Mocking the AWS SDK client would allow testing these paths without real credentials.

## Proposed fix

1. Use `vi.mock("../../src/server/services/aws-clients", ...)` in tests to mock the AWS SDK clients.
2. Write tests for the error handling paths of the three mutating ECS endpoints (when the AWS call throws, the route should return 500 with `applied: false`).
3. Remove `src/server/routes/ecs.ts` from the coverage exclusion list once mocked tests exist.
4. The same applies to `src/server/routes/aws.ts` read-only endpoints — their error paths can be tested with mocked SDK clients.

## Acceptance checks

- [ ] `POST /api/ecs/services/:cluster/:service/scale` error path is tested (SDK throws → 500 returned).
- [ ] `POST /api/ecs/tasks/:cluster/:taskId/stop` error path is tested.
- [ ] Coverage exclusion for `ecs.ts` removed from `vitest.config.ts`.
- [ ] All new tests pass without real AWS credentials.

## Debate

### Gatekeeper claim

The mutating AWS routes are the highest-risk code in the repo. Excluding them from coverage with "requires real credentials" is not accurate — error paths and mocked success paths can be tested without credentials. The coverage exclusion hides a real gap.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
