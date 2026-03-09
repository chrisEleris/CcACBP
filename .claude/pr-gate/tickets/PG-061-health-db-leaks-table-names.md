---
id: PG-061
title: Health endpoint /api/health/db leaks all internal table names bypassing schema allowlist
severity: medium
status: fixed
files: [src/server/routes/health.ts]
created_by: independent-auditor
updated_by: independent-auditor
---

## Summary

`GET /api/health/db` returns all table names from `sqlite_master`, bypassing the `SCHEMA_ALLOWED_TABLES` allowlist in `query.ts`. Exposes internal tables like `ai_conversations`, `report_executions`, etc.

## Evidence

- `src/server/routes/health.ts:11-25` — returns full table list
- `src/server/routes/query.ts:55` — `SCHEMA_ALLOWED_TABLES` allowlist exists but not applied to health

## Why this matters

Information disclosure that aids reconnaissance. Attackers learn internal schema structure.

## Proposed fix

Return only `{ status: "ok", tableCount: result.length }` instead of table names, or apply the same allowlist.

## Acceptance checks

- [ ] Health endpoint does not expose table names
- [ ] Test updated

## Debate

### Gatekeeper claim

Schema disclosure bypasses existing allowlist.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
