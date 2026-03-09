---
id: PG-005
title: GET /api/query/schema exposes full internal database schema to all API callers
severity: medium
status: fixed
files:
  - src/server/routes/query.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`GET /api/query/schema` queries `sqlite_master` and returns the complete list of all application tables and their column names, including internal operational tables (`ai_conversations`, `ai_messages`, `report_executions`, `scheduled_reports`, etc.). This information is useful for query autocompletion in the Query Explorer UI but also reveals the complete internal data model to any caller with API access, enabling targeted data extraction queries.

## Evidence

- `src/server/routes/query.ts:38-57` — `getDbSchema()` reads from `sqlite_master` without any filtering by table name, returning all non-system tables.
- `tests/server/query.test.ts:49-56` — the test explicitly asserts that all internal tables are present in the response: `ai_conversations`, `ai_messages`, `report_executions`, `query_snippets`, `scheduled_reports`, `data_sources`, `saved_reports`.
- There is no allow-list of tables that should be visible to callers.

## Why this matters

An authenticated caller combining the schema endpoint with the query execute endpoint (even in its current stub state, or after stub replacement) can enumerate the full schema before crafting targeted queries. For a multi-tenant future or for an operator who stores sensitive connection credentials in `data_sources.config`, knowing the table structure aids targeted attacks. The schema endpoint is also unauthenticated if `API_KEY` is not configured (see PG-002).

## Proposed fix

1. Define an explicit allow-list of tables the schema endpoint returns — likely only `query_snippets` and `saved_reports`, or tables that correspond to user-created data sources.
2. Exclude internal operational tables (`ai_conversations`, `ai_messages`, `report_executions`, `dashboard_widgets`, `report_templates`) from the schema response.
3. Update the test to assert the allow-list, not the full table set.

## Acceptance checks

- [ ] `GET /api/query/schema` does not return `ai_conversations`, `ai_messages`, or `report_executions`.
- [ ] The Query Explorer UI still functions with the filtered schema.
- [ ] Tests updated to assert only the expected tables appear.

## Debate

### Gatekeeper claim

The endpoint returns the complete internal schema. While this is useful for UI autocompletion, the current unbounded response exposes application internals. A targeted allow-list is the correct control.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
