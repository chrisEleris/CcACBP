---
id: PG-055
title: ECS GET endpoints pass raw path parameters to AWS SDK without validation applied to POST endpoints
severity: medium
status: fixed
files:
  - src/server/routes/ecs.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

The fix for PG-003 added `ecsParamSchema` validation and cluster allow-list checks to the three POST/mutation endpoints (`/scale`, `/deploy`, `/stop`). However, the four GET endpoints — `GET /clusters/:name`, `GET /services/:cluster`, `GET /tasks/:cluster/:service`, and `GET /events/:cluster` — pass the raw `c.req.param()` values directly to the AWS SDK without any validation or allow-list check.

## Evidence

Mutation endpoints (correct — validated):
```
POST /services/:cluster/:service/scale  — lines 349-378, ecsParamSchema applied
POST /services/:cluster/:service/deploy — lines 381-414, ecsParamSchema applied
POST /tasks/:cluster/:taskId/stop       — lines 416-443, ecsParamSchema applied
```

GET endpoints (missing validation):
```
GET /clusters/:name        — line 178: const name = c.req.param("name");
GET /services/:cluster     — line 210: const cluster = c.req.param("cluster");
GET /tasks/:cluster/:service — lines 285-286: raw params used directly
GET /events/:cluster       — line 446: const cluster = c.req.param("cluster");
```

`ecsParamSchema` (line 34-38) validates format with `ECS_PARAM_REGEX = /^[a-zA-Z0-9\-_/.:\s]*$/` and enforces `MAX_PARAM_LENGTH = 255`. None of this runs for GET routes.

Additionally, `checkClusterAllowed()` is never called for any GET endpoint, so even when `ALLOWED_ECS_CLUSTERS` is configured to restrict mutations, callers can still describe and list all clusters by name via GET.

## Why this matters

1. **Input injection**: The raw path parameter is passed directly to `DescribeClustersCommand({ clusters: [name] })`, `ListServicesCommand({ cluster })`, etc. While the AWS SDK likely handles malicious strings gracefully, passing user-controlled strings without sanitization to external APIs is poor practice and could cause unexpected behavior with specially crafted inputs (path traversal patterns like `../../`, extremely long names, etc.).

2. **Allow-list bypass**: `ALLOWED_ECS_CLUSTERS` is documented as restricting which clusters the app can interact with. Because GET endpoints bypass `checkClusterAllowed`, an operator who sets `ALLOWED_ECS_CLUSTERS=prod-cluster` to prevent accidental mutations on `dev-cluster` still allows any API caller to describe `dev-cluster` and enumerate its services and tasks.

3. **Inconsistency**: The fix from PG-003 explicitly defined `ecsParamSchema` and `checkClusterAllowed` for this purpose — applying them only to POST endpoints creates a false sense of completeness.

## Proposed fix

Apply `ecsParamSchema.safeParse()` and `checkClusterAllowed()` to all four GET endpoints, following the same pattern as the mutation endpoints:

```ts
.get("/clusters/:name", async (c) => {
  const nameRaw = c.req.param("name");
  const nameParsed = ecsParamSchema.safeParse(nameRaw);
  if (!nameParsed.success) return c.json({ message: "Invalid cluster identifier" }, 400);
  const name = nameParsed.data;
  const clusterError = checkClusterAllowed(name);
  if (clusterError) return c.json({ message: clusterError }, 403);
  // ... rest of handler
})
```

## Acceptance checks

- [ ] `GET /ecs/clusters/../../etc` returns 400.
- [ ] With `ALLOWED_ECS_CLUSTERS=prod`, `GET /ecs/services/dev-cluster` returns 403.
- [ ] Existing ECS GET tests continue to pass.
- [ ] New tests cover the param validation rejection for at least one GET endpoint.

## Debate

_Not yet provided._

## Final resolution

Pending.
