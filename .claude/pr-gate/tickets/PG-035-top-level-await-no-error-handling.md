---
id: PG-035
title: Top-level await in DB module has no error handling
severity: medium
status: open
files: [src/server/db/index.ts]
created_by: principal-engineer
updated_by: principal-engineer
---

## Summary

`await initializeSchema(client)` at ES module top level blocks the entire import chain at startup. If the database is unavailable, the rejection propagates as an unhandled promise rejection with no `try/catch`.

## Evidence

- `src/server/db/index.ts:12` — Top-level `await initializeSchema(client)` with no error handling

## Why this matters

- Opaque libsql stack trace instead of user-friendly startup error
- Blocks entire module import chain
- No recovery or graceful shutdown possible

## Proposed fix

Move schema initialization to `entry.ts` with proper error handling:
```typescript
try {
  await initializeSchema(client);
} catch (err) {
  console.error("Fatal: Failed to initialize database schema:", err);
  process.exit(1);
}
```

## Acceptance checks

- [ ] Schema init moved to entry point
- [ ] Error produces readable message
- [ ] Server starts correctly when DB is available

## Debate

### Gatekeeper claim

Top-level await without error handling is a reliability risk.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
