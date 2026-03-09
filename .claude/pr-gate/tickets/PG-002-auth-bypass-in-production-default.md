---
id: PG-002
title: API_KEY is optional by default - all mutation endpoints unprotected without it
severity: high
status: fixed
files:
  - src/server/config.ts
  - src/server/middleware/auth.ts
  - src/server/entry.ts
  - .env.example
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`API_KEY` is defined as `z.string().min(1).optional()` in config.ts, making it entirely absent by default. The `apiKeyAuth` middleware explicitly skips all authentication when `API_KEY` is not set. A production deployment that forgets to configure `API_KEY` — or one that follows the `.env.example` file literally (where `API_KEY=` is left blank) — exposes all mutation endpoints (POST/PUT/DELETE on reports, data sources, conversations, snippets, scheduled reports) with no authentication whatsoever. The only protection is a `console.warn` at startup.

## Evidence

- `src/server/config.ts:8` — `API_KEY: z.string().min(1).optional()` — key is optional.
- `src/server/middleware/auth.ts:32-35` — `if (!apiKey) { await next(); return; }` — auth is silently skipped when no key is configured.
- `src/server/entry.ts:14-18` — only a `console.warn` when in production without an API_KEY. No hard failure.
- `.env.example:12` — `API_KEY=` (blank value) — the example file actively encourages operators to leave this unset.

## Why this matters

A misconfigured or freshly deployed container with no `API_KEY` env var gives any HTTP client full write access to the database — creating, updating, deleting reports, data sources, conversations. For a dashboard tool that connects to AWS credentials, this is a high-severity exposure. The warning is logged to stdout but may not be monitored. There is no deployment-time hard failure.

## Proposed fix

Option A (recommended): In production, require `API_KEY` to be set. In `entry.ts`, change the warn to:
```ts
if (!config.API_KEY && config.NODE_ENV === "production") {
  console.error("FATAL: API_KEY must be set in production. Exiting.");
  process.exit(1);
}
```

Option B: Make `API_KEY` non-optional (`z.string().min(32)`) and provide a distinct `SKIP_AUTH=true` flag only available in development environments.

Also update `.env.example` to document a sample key and explicitly note it is required in production.

## Acceptance checks

- [ ] Starting the server in production without `API_KEY` exits with a non-zero code or throws.
- [ ] `.env.example` makes clear `API_KEY` must be set before deploying.
- [ ] Test for the `when API_KEY is not configured (dev mode)` case still passes (dev bypass is acceptable).

## Debate

### Gatekeeper claim

The combination of optional key + silent middleware bypass + a console.warn (not error) + a blank `.env.example` line creates a low-friction path to accidental open access in production. The risk is concrete: any mutation endpoint becomes public.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
