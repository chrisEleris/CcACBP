---
id: PG-073
title: VACUUM and REINDEX SQLite write keywords absent from isWriteStatement block list
severity: low
status: open
files: [src/server/routes/query.ts, tests/server/query.test.ts]
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`isWriteStatement()` blocks `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `ATTACH`, `DETACH`, `REPLACE`, and `PRAGMA`. It does not block `VACUUM` or `REINDEX`, both of which are SQLite write-operation statements that modify the database file. `SAVEPOINT`, `RELEASE`, `ROLLBACK`, `BEGIN`, and `COMMIT` are also absent but are less dangerous for a read-only query interface.

## Evidence

`src/server/routes/query.ts` lines 19–20:

```typescript
const WRITE_STATEMENT_PATTERN =
  /^\s*(?:--[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|ATTACH|DETACH|REPLACE|PRAGMA)\b/i;
```

Verification:

```javascript
const WRITE_RE = /^\s*...(INSERT|UPDATE|DELETE|DROP|...|PRAGMA)\b/i;
WRITE_RE.test('VACUUM');   // false
WRITE_RE.test('REINDEX');  // false
```

SQLite documentation:
- `VACUUM`: Rebuilds the database file, reclaiming space. Modifies the database file. Cannot run on a read-only connection but passes the current filter.
- `REINDEX`: Drops and re-creates indexes. Modifies database structures.

The test suite in `tests/server/query.test.ts` has no test cases for `VACUUM` or `REINDEX`.

**Current impact**: The `/api/query/execute` endpoint is a stub returning mock data (line 140–157 of `query.ts`). No real SQL is executed. Therefore this is not currently exploitable.

**Future impact**: The comment on line 140 explicitly states "When implementing real execution" this endpoint will run actual SQL. The defense-in-depth check is intended to remain as a permanent filter. When real execution is wired up, `VACUUM` and `REINDEX` will slip through unless the filter is updated.

## Why this matters

The code comment explicitly frames `isWriteStatement` as a permanent defense-in-depth layer:

> "Defense-in-depth: block write statements at the application layer even if the underlying connection were somehow not read-only."

If the actual execution implementation relies on this filter and a read-only SQLite connection is not correctly enforced, `VACUUM` would succeed on a writable connection. `VACUUM` in SQLite can rename and recreate the database file, which can cause data integrity issues.

Additionally, blocking `VACUUM` and `REINDEX` is consistent with the stated goal ("only SELECT queries are allowed" per the error message on lines 134–136).

## Proposed fix

Add `VACUUM` and `REINDEX` to the block list:

```typescript
const WRITE_STATEMENT_PATTERN =
  /^\s*(?:--[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|ATTACH|DETACH|REPLACE|PRAGMA|VACUUM|REINDEX)\b/i;
```

Optionally add `BEGIN`, `SAVEPOINT`, `RELEASE`, `ROLLBACK`, `COMMIT` for completeness, since transaction control statements should not be user-accessible in a read-only query interface.

## Acceptance checks

- [ ] `isWriteStatement('VACUUM')` returns `true`
- [ ] `isWriteStatement('REINDEX')` returns `true`
- [ ] Tests covering `VACUUM` and `REINDEX` are added to `query.test.ts`
- [ ] The updated error message lists the newly blocked keywords (or is made more generic)

## Debate

*(empty — no author response yet)*

## Final resolution

*(pending)*
