---
id: PG-003
title: ECS scale and stop endpoints perform live AWS mutations without authorization checks beyond API key
severity: high
status: fixed
files:
  - src/server/routes/ecs.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`POST /api/ecs/services/:cluster/:service/scale`, `POST /api/ecs/services/:cluster/:service/deploy`, and `POST /api/ecs/tasks/:cluster/:taskId/stop` issue real AWS API calls that mutate running infrastructure (change task counts, force redeployments, terminate tasks). These endpoints perform no input validation on the `cluster` and `service` path parameters beyond what Hono provides by default (which is none). An authenticated caller can supply arbitrary cluster and service names, including names for clusters they should not control.

## Evidence

- `src/server/routes/ecs.ts:311-328` — `POST /services/:cluster/:service/scale` reads `cluster` and `service` directly from path params and passes them to `UpdateServiceCommand` with no allow-list or ownership check.
- `src/server/routes/ecs.ts:329-349` — `POST /services/:cluster/:service/deploy` — same pattern, forces a new ECS deployment.
- `src/server/routes/ecs.ts:351-364` — `POST /tasks/:cluster/:taskId/stop` — calls `StopTaskCommand` with caller-supplied `cluster` and `taskId`.
- `src/server/routes/ecs.ts:29` — `scaleServiceSchema` only validates `desiredCount` (int, 0–100); no schema validates the path params.
- The AWS credentials are shared application-wide (`src/server/services/aws-clients.ts`), so the IAM permissions of the app process apply to any cluster reachable from those credentials.

## Why this matters

If the application's IAM role has broad ECS permissions (common in dev/staging), an API caller can scale any service to 0 tasks (denial of service) or force-restart any service. The `StopTask` endpoint can terminate tasks in clusters unrelated to those the dashboard is intended to manage. There is no allow-list of permitted cluster ARNs.

## Proposed fix

1. Add path-param validation schemas using Zod (e.g., max length, safe character set — alphanumeric plus `-_./`) to reject obviously malformed cluster/service names.
2. Add an optional `ALLOWED_ECS_CLUSTERS` env var (comma-separated cluster name or ARN prefixes). When set, `scale`, `deploy`, and `stop` endpoints reject requests for clusters not in the allow-list with a 403.
3. Document in the API that these endpoints are destructive and require explicit cluster allow-listing.

## Acceptance checks

- [ ] Requests with path params containing `../` or shell metacharacters return 400.
- [ ] When `ALLOWED_ECS_CLUSTERS` is set, requests for unlisted clusters return 403.
- [ ] Existing ECS helper function unit tests still pass.

## Debate

### Gatekeeper claim

The three endpoints issue real AWS mutations with no parameter validation on cluster/service/task identity. The AWS credentials are application-global. This is a concrete authorization gap when the app's IAM role has permissions across multiple clusters.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
