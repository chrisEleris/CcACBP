---
id: PG-020
title: No rate limiting on any API endpoint - AI analyze and ECS mutation endpoints especially exposed
severity: medium
status: fixed
files:
  - src/server/index.ts
  - src/server/routes/ai.ts
  - src/server/routes/ecs.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

No rate limiting middleware is applied to any endpoint. The comment in `src/server/routes/query.ts:68` acknowledges "Add per-user rate limiting" as a missing safeguard. The most sensitive endpoints are: `POST /api/ai/analyze` (which will call an external LLM API with cost implications), `POST /api/ecs/services/:cluster/:service/scale` (live AWS infrastructure mutation), and `POST /api/ecs/tasks/:cluster/:taskId/stop` (task termination).

## Evidence

- `src/server/index.ts:19-55` — only `cors`, `secureHeaders`, and `bodyLimit` middleware applied globally. No rate limiter.
- `src/server/routes/query.ts:68` — comment: "Add per-user rate limiting".
- No `hono/rate-limiter` or equivalent in `package.json`.
- The 1 MB body limit (`bodyLimit`) protects against request body attacks but not repeated small requests.

## Why this matters

1. `POST /api/ai/analyze` — when a real LLM is connected, an unauthenticated or authenticated caller can generate unbounded API costs by sending rapid requests.
2. `POST /api/ecs/.../scale` — rapid repeated calls could repeatedly scale a service, generating AWS API throttling or unexpected autoscaling behavior.
3. `POST /api/ecs/.../stop` — repeated calls can terminate all tasks in a service before the service can recover.
4. `POST /api/ai/conversations` and `POST /api/ai/conversations/:id/messages` — can generate unbounded database growth.

## Proposed fix

1. Add Hono's rate limiter middleware (`hono/rate-limiter`) or an equivalent (e.g., `hono-rate-limiter` npm package).
2. Apply a global rate limit (e.g., 100 req/min per IP) to all `/api/*` endpoints.
3. Apply stricter limits to specific endpoints: `POST /api/ai/analyze` (e.g., 10 req/min), ECS mutation endpoints (e.g., 5 req/min).

## Acceptance checks

- [ ] Sending >100 requests/min to any endpoint returns 429 Too Many Requests.
- [ ] `POST /api/ai/analyze` returns 429 after the configured limit.
- [ ] Rate limiting does not break any existing tests (adjust test configuration or use test bypass).

## Debate

### Gatekeeper claim

No rate limiting on a dashboard with live AWS mutation endpoints and an AI endpoint that will incur external API costs is a standard production readiness gap. The code itself acknowledges the missing control.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
