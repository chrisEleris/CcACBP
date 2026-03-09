---
id: PG-043
title: Connectors test route returns inconsistent response shape (success field)
severity: low
status: open
files: [src/server/routes/connectors.ts]
created_by: principal-engineer
updated_by: principal-engineer
---

## Summary

`/api/connectors/:id/test` returns `{ success: false, message: "..." }`. Every other route uses `{ data: ..., message?: string }`. This is the only route with a `success: boolean` key.

## Evidence

- `src/server/routes/connectors.ts` — Test route uses `success` field
- All other routes use `data` field pattern

## Why this matters

- Inconsistent API contract
- Client needs special handling for this endpoint

## Proposed fix

Standardize to `{ data: { connected: false }, message: "..." }`.

## Acceptance checks

- [ ] Consistent response shape across all routes
- [ ] Client handles the updated response

## Debate

### Gatekeeper claim

API consistency reduces client complexity and prevents bugs.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
