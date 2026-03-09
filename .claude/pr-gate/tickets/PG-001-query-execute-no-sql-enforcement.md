---
id: PG-001
title: Query execute endpoint accepts arbitrary SQL without read-only enforcement
severity: high
status: fixed
files:
  - src/server/routes/query.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

The `/api/query/execute` endpoint accepts arbitrary SQL from the client and passes it through without any write-operation filtering. The stub comment acknowledges the risk ("Enforce read-only connections (no INSERT/UPDATE/DELETE/DROP/ALTER)") but no guard is implemented. Since the endpoint is connected to the app's own SQLite database via Drizzle/libSQL, a client with API access can currently submit `DROP TABLE saved_reports;` or `DELETE FROM ai_conversations;` against the production database.

## Evidence

- `src/server/routes/query.ts:61-87` — the `POST /execute` handler calls `c.req.valid("json")` to get the SQL string but then ignores it entirely and returns mock data. This means the guard is absent on both paths: mock path (no execution, no harm now) and any real-execution path added later.
- `src/server/routes/query.ts:63-82` — comments inside the handler explicitly list the missing safeguards: read-only connection, timeout limits, parameterized queries, rate limiting.
- The Zod schema at line 12 only validates length (`min(1).max(50_000)`), not content.

## Why this matters

When the stub is replaced with real query execution (which is the stated intent), any authenticated caller — or any unauthenticated caller if `API_KEY` is unset (which is the default in dev and is warned-about but allowed in production) — can destroy the application database. Even in the current mock state, the endpoint surface exists and teaches callers that arbitrary SQL input is acceptable, making it more likely the real implementation inherits this flaw.

## Proposed fix

1. Add a SQL keyword block-list check before the stub (and before any real execution): reject statements that begin with `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `ATTACH`, `DETACH` (case-insensitive, after stripping leading whitespace and comments).
2. Add an explicit 400 response when a write statement is detected, documenting the read-only contract in the response message.
3. Document in a code comment that the check is a defense-in-depth layer and must be paired with a read-only DB connection in real execution.

## Acceptance checks

- [ ] Sending `DELETE FROM saved_reports` to `POST /api/query/execute` returns 400 with a descriptive error.
- [ ] Sending `SELECT 1` continues to return 200.
- [ ] Unit test covers the block-list for at least: DELETE, DROP TABLE, INSERT INTO, UPDATE, ALTER TABLE.

## Debate

### Gatekeeper claim

The endpoint comment explicitly names the missing guards. No read-only enforcement exists at the route layer. The risk escalates the moment the stub is replaced, and teaching callers that arbitrary SQL is accepted creates a latent injection surface.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
