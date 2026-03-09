---
id: PG-006
title: Database schema initialization runs at module import time with top-level await
severity: medium
status: fixed
files:
  - src/server/db/index.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`src/server/db/index.ts` uses a top-level `await initializeSchema(client)` at module scope. This means the database schema initialization runs synchronously as part of module resolution — before any application startup code can set up error handlers, health checks, or fallback logic. Any error during schema initialization is an unhandled promise rejection that can crash the process without a meaningful error message.

## Evidence

- `src/server/db/index.ts:12` — `await initializeSchema(client);` at module top-level.
- `src/server/db/migrate.ts:7` — `initializeSchema` calls `client.executeMultiple(...)` which can throw on malformed SQL or if the database file is locked/corrupted.
- No try/catch wraps the top-level await.
- The vitest config `vitest.config.ts:15` sets `DATABASE_URL: "file::memory:?cache=shared"` — this works because the in-memory DB always succeeds, masking any production failure path.

## Why this matters

If the database URL is misconfigured, the file system is read-only, or the SQLite file is locked by another process, the module import throws an unhandled rejection. In Node.js with top-level await in ESM modules, this causes the process to exit with a non-descriptive error. There is no startup sequence that can catch this and produce a clear "database unavailable" message or retry.

Additionally, the pattern makes unit testing harder: importing `src/server/db/index.ts` in any test immediately attempts real database operations, requiring the `DATABASE_URL` env var to be set before tests run.

## Proposed fix

Wrap the initialization in an explicit exported `initDb()` function and call it from `entry.ts` with proper error handling:

```ts
// db/index.ts
export async function initDb(): Promise<void> {
  await initializeSchema(client);
}
export const db = drizzle(client, { schema });
```

```ts
// entry.ts
try {
  await initDb();
} catch (err) {
  console.error("FATAL: Database initialization failed:", err);
  process.exit(1);
}
```

## Acceptance checks

- [ ] Database initialization errors produce a clear message before process exit.
- [ ] Module import of `db/index.ts` does not perform I/O.
- [ ] Tests still pass with the refactored initialization.

## Debate

### Gatekeeper claim

Top-level await for I/O at module scope is a known anti-pattern in Node.js servers. Errors during schema init are silent or produce unhelpful stack traces. The fix is low-risk (move the call one level up).

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
