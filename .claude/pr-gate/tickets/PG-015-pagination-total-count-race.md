---
id: PG-015
title: Paginated list endpoints use separate COUNT query creating TOCTOU inconsistency
severity: low
status: open
files:
  - src/server/routes/reports.ts
  - src/server/routes/ai.ts
  - src/server/routes/data-sources.ts
  - src/server/routes/query.ts
  - src/server/routes/scheduled-reports.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

Every paginated endpoint issues two separate queries: one `SELECT ... LIMIT/OFFSET` for the data and one `SELECT count(*) ...` for the total. These two queries are not executed in a single transaction, so the total count can be stale relative to the returned data. If a record is inserted or deleted between the two queries, the pagination metadata is incorrect.

## Evidence

- `src/server/routes/reports.ts:39-56` — separate `db.select().from(savedReports)...` and `db.get<{ count: number }>(sql\`select count(*)\`)`.
- `src/server/routes/ai.ts:92-106` — same pattern for conversations.
- `src/server/routes/data-sources.ts:95-106` — same pattern.
- `src/server/routes/query.ts:89-110` — same pattern for snippets.
- `src/server/routes/scheduled-reports.ts:48-76` — same pattern.

None of these are wrapped in a `db.transaction(...)` block.

## Why this matters

For a single-user dashboard tool this is a minor cosmetic issue (the count badge may show an incorrect total briefly). For a multi-user or high-concurrency deployment, the stale count can cause pagination logic to skip or duplicate records across pages. The inconsistency also makes it harder to implement cursor-based pagination in the future.

The pattern is also unnecessarily verbose — SQLite supports `COUNT(*) OVER ()` window functions or the queries could be combined.

## Proposed fix

Wrap the data + count queries in a `db.transaction(async (tx) => { ... })` block to ensure consistent reads, or use a single query with a window function:

```sql
SELECT *, COUNT(*) OVER () as total FROM saved_reports ORDER BY created_at DESC LIMIT ? OFFSET ?
```

## Acceptance checks

- [ ] Data and count queries are executed within a single read transaction.
- [ ] Existing pagination tests pass.
- [ ] No performance regression for in-memory test DB.

## Debate

### Gatekeeper claim

Non-transactional count + data queries create a TOCTOU inconsistency. Low severity for a single-user tool, but the pattern is repeated across 5 routes and should be standardized.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
