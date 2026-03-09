---
id: PG-057
title: ALLOWED_ECS_CLUSTERS config field is absent from .env.example
severity: nit
status: open
files:
  - .env.example
  - src/server/config.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`src/server/config.ts` defines `ALLOWED_ECS_CLUSTERS` as a recognized config field (introduced as part of the PG-003 fix). This field is not present in `.env.example`, which is the only operator-facing documentation for configuring the application.

## Evidence

`src/server/config.ts:9-10`:
```ts
// Comma-separated list of allowed ECS cluster names/ARNs. When unset, all clusters are allowed.
ALLOWED_ECS_CLUSTERS: z.string().optional(),
```

`.env.example` — contains `PORT`, `NODE_ENV`, `DATABASE_URL`, `AWS_REGION`, `API_KEY`, `SECRET_KEY`. `ALLOWED_ECS_CLUSTERS` is absent.

## Why this matters

An operator deploying to production will not know this security control exists. Without knowing to set `ALLOWED_ECS_CLUSTERS`, they leave all clusters accessible by default. The comment in `config.ts` says "When unset, all clusters are allowed" — this is a permissive default that should be prominently documented.

## Proposed fix

Add to `.env.example`:
```env
# ECS cluster allow-list (optional but recommended for production)
# Comma-separated list of cluster names or ARNs that the dashboard may access.
# When unset, all clusters are accessible. Example: ALLOWED_ECS_CLUSTERS=prod-cluster,staging-cluster
# ALLOWED_ECS_CLUSTERS=
```

## Acceptance checks

- [ ] `.env.example` contains a commented `ALLOWED_ECS_CLUSTERS` entry with explanatory comment.

## Debate

_Not yet provided._

## Final resolution

Pending.
