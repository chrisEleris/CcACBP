---
id: PG-050
title: SQL write-statement check bypassed by multi-statement queries and missing REPLACE/PRAGMA keywords
severity: high
status: fixed
files:
  - src/server/routes/query.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

The `isWriteStatement` function added to fix PG-001 only checks whether the **start** of the SQL string matches a write keyword. A caller can prepend any valid `SELECT` to defeat the guard entirely. Additionally, `REPLACE` (SQLite's upsert alias), `PRAGMA` with write arguments, and `WITH ... INSERT` (CTE-based inserts) are not covered by the block-list regex.

## Evidence

Verified with `node -e`:

```js
const WRITE_STATEMENT_PATTERN =
  /^\s*(?:--[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|ATTACH|DETACH)\b/i;

isWriteStatement('SELECT 1; DROP TABLE users') // → false  (bypassed)
isWriteStatement('REPLACE INTO users VALUES (1,2,3)') // → false  (missing keyword)
isWriteStatement('PRAGMA journal_mode=DELETE')  // → false  (missing keyword)
isWriteStatement('WITH cte AS (SELECT 1) INSERT INTO t SELECT * FROM cte') // → false (CTE bypass)
```

- `src/server/routes/query.ts:14-23` — `WRITE_STATEMENT_PATTERN` anchored to start (`^`) only.
- `src/server/routes/query.ts:87-125` — the guard fires before the stub return but the stub comment says "when implementing real execution" — the same pattern will be reused.

The endpoint is currently a stub (returns mock data), but the code explicitly says the guard is "defense-in-depth" intended for real execution. All four bypass vectors would allow write operations when real execution is wired in.

## Why this matters

The `SELECT 1; DROP TABLE users` bypass is trivially obvious to anyone who reads the error message ("Only SELECT queries are allowed") and knows SQLite allows semicolon-separated statements in its multi-statement API. The libSQL client's `executeMultiple` (used in `migrate.ts`) explicitly supports multiple statements. If the real execution path ever calls `client.executeMultiple` or `client.execute` with unsanitized input, this guard provides no protection.

`REPLACE` is a standard SQLite keyword that inserts or replaces rows — effectively an upsert. `PRAGMA journal_mode=DELETE` and similar writeable pragmas modify database settings. These are missing from the block-list entirely.

## Proposed fix

1. Change the pattern from a prefix-only check to a **full-statement scanner**: after splitting on `;`, check every individual statement for write keywords.
2. Add `REPLACE` to the block-list.
3. Add `PRAGMA` to the block-list (any `PRAGMA` call is either read-only or potentially destructive — reject all to be safe).
4. Add a check that rejects `WITH ... (INSERT|UPDATE|DELETE)` patterns.
5. Alternatively: if the underlying libSQL connection is ever a true read-only connection (WAL reader, or a separate read-only libSQL URL), the application-layer guard can be a safety net rather than the primary control.

## Acceptance checks

- [ ] `SELECT 1; DROP TABLE users` returns 400.
- [ ] `REPLACE INTO t VALUES (1)` returns 400.
- [ ] `PRAGMA journal_mode=DELETE` returns 400.
- [ ] `WITH cte AS (SELECT 1) INSERT INTO t SELECT * FROM cte` returns 400.
- [ ] `SELECT 1; SELECT 2` returns 200 (multi-statement SELECT is fine).
- [ ] Tests cover all four bypass vectors.

## Debate

_Not yet provided._

## Final resolution

**Cycle 6 Gatekeeper verification (2026-03-09):**

Fix confirmed present in `src/server/routes/query.ts`:

- Lines 39–71: `splitStatements()` is a string-literal-aware state machine that does not split on semicolons inside single-quoted, double-quoted, or backtick-quoted strings.
- Lines 84–103: `isWriteStatement()` iterates every statement returned by `splitStatements`, checking each against `WRITE_STATEMENT_PATTERN`. The pattern now includes `REPLACE`, `PRAGMA`, `ATTACH`, and `DETACH`.
- Lines 94–99: CTE-wrapped write detection (`WITH ... INSERT|UPDATE|DELETE`).
- All four acceptance criteria verified against the passing test suite (449 tests, 0 failures).

Status: **fixed**.
