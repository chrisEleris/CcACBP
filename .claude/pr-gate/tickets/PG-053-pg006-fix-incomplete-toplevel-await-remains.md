---
id: PG-053
title: PG-006 fix incomplete - top-level await initDb() still exists in db/index.ts
severity: medium
status: fixed
files:
  - src/server/db/index.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

PG-006 was marked `fixed` after the PR that introduced `initDb()` and explicit error handling in `entry.ts`. However, `src/server/db/index.ts` still contains a top-level `await initDb()` at line 37, which means the original problem — database I/O at module-import time — was not actually eliminated.

## Evidence

`src/server/db/index.ts:35-37`:
```ts
// Eagerly initialise the schema when the module is first imported.
// Errors are surfaced with a clear message rather than a bare unhandled rejection.
await initDb();
```

The comment says "errors are surfaced with a clear message" but `initDb()` itself catches errors, logs them, and re-throws. The re-throw from a top-level `await` in an ESM module is still an **unhandled top-level-await rejection** if nothing wraps the import — which is exactly the original problem.

`entry.ts:31-36` wraps `await initDb()` in a try/catch and calls `process.exit(1)` — this is correct. But `db/index.ts` **also** calls `await initDb()` independently at line 37, meaning:

1. When `entry.ts` imports `db/index.ts`, the module-level `await initDb()` runs first (before `entry.ts`'s own try/catch).
2. If that fails, Node.js emits an unhandled rejection and the `entry.ts` try/catch never executes.
3. In test environments, any test that imports `db/index.ts` (directly or transitively) triggers a real DB init call before `entry.ts` is ever loaded.

## Why this matters

The original PG-006 concern was:
- Startup errors produce unclear messages.
- Tests must have `DATABASE_URL` set before any test file that imports `db/index.ts`.

Both remain true. The `initDb()` exported function was added but the module-level invocation was not removed. The fix from `entry.ts` is redundant (it calls `initDb()` a second time) and the first call (from module-level) retains the original risk.

## Proposed fix

Remove the top-level `await initDb()` from `db/index.ts`. Only `entry.ts` should invoke it:

```diff
- // Eagerly initialise the schema when the module is first imported.
- // Errors are surfaced with a clear message rather than a bare unhandled rejection.
- await initDb();
```

For test environments, vitest's `globalSetup` or a shared test setup file should call `initDb()` once before any test suite runs, so tests retain a properly-initialized database without depending on the module-level side effect.

## Acceptance checks

- [ ] `src/server/db/index.ts` has no top-level `await` statement.
- [ ] `entry.ts` is the sole caller of `initDb()` during normal server startup.
- [ ] All 390 existing tests continue to pass.
- [ ] A test that imports `db/index.ts` without calling `initDb()` explicitly does not perform any database I/O.

## Debate

_Not yet provided._

## Final resolution

Pending.
