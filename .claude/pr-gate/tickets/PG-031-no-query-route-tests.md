---
id: PG-031
title: Query routes (/api/query) have no test coverage for schema, execute, and snippets
severity: medium
status: open
files: [src/server/routes/query.ts, tests/server/query.test.ts]
created_by: qa-engineer
updated_by: qa-engineer
---

## Summary

The query route file contains critical endpoints (`GET /api/query/schema`, `POST /api/query/execute`, snippet CRUD) but the test file `tests/server/query.test.ts` may not cover all endpoints, particularly the SQL execution path and schema exposure path.

## Evidence

- `src/server/routes/query.ts` — Contains schema, execute, and snippet endpoints
- Query execute endpoint accepts SQL — critical security surface area
- PG-001 already flags SQL injection risk, but the route also needs positive test coverage

## Why this matters

- SQL execution endpoint is the highest-risk surface in the application
- Schema endpoint exposes internal database structure
- Snippet CRUD needs validation testing
- Without tests, regressions in these critical paths go undetected

## Proposed fix

Create comprehensive tests covering:
1. `GET /api/query/schema` — asserts structure of returned tables and columns
2. `POST /api/query/execute` — tests with valid SELECT, rejects dangerous SQL
3. Snippet CRUD — `POST`, `GET`, `DELETE /api/query/snippets`

## Acceptance checks

- [ ] All query endpoints have test coverage
- [ ] SQL injection prevention is tested
- [ ] Schema endpoint response structure is verified
- [ ] Snippet CRUD lifecycle is tested

## Debate

### Gatekeeper claim

The most security-critical endpoint in the application has insufficient test coverage.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
