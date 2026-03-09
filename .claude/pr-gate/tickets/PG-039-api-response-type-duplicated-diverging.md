---
id: PG-039
title: ApiResponse<T> defined twice with diverging shapes
severity: medium
status: open
files: [src/shared/types.ts, src/client/lib/api.ts]
created_by: principal-engineer
updated_by: principal-engineer
---

## Summary

The shared type is `{ data: T; message?: string }`. The local client type adds `error?: string`. A developer importing the shared type loses the `error` field silently.

## Evidence

- `src/shared/types.ts:5` — `{ data: T; message?: string }`
- `src/client/lib/api.ts:1` — `{ data: T; error?: string; message?: string }`
- `src/client/lib/use-fetch.ts:28` — Reads `error` field from response

## Why this matters

- Diverging type definitions cause silent bugs
- Importing wrong type loses error handling

## Proposed fix

Add `error?: string | null` to the shared type. Delete the local definition in `api.ts` and import from shared types.

## Acceptance checks

- [ ] Single `ApiResponse<T>` definition
- [ ] Error field included in shared type
- [ ] All imports use shared type

## Debate

### Gatekeeper claim

Duplicate type definitions with diverging shapes are a maintenance hazard.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
