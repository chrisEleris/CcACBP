---
id: PG-060
title: redactConfig returns raw string on JSON parse failure — credential leakage
severity: high
status: fixed
files: [src/server/routes/data-sources.ts]
created_by: independent-auditor
updated_by: independent-auditor
---

## Summary

If `JSON.parse(configStr)` fails in `redactConfig()`, the catch block returns the raw string unredacted. This leaks connection strings like `mysql://user:password@host/db` directly to API callers.

## Evidence

- `src/server/routes/data-sources.ts:73-80` — catch returns `configStr` as-is

## Why this matters

Malformed JSON from decryption errors or non-JSON configs exposes credentials directly.

## Proposed fix

Return a safe placeholder like `"[config unavailable]"` on parse failure instead of the raw string.

## Acceptance checks

- [ ] Parse failure returns safe placeholder, not raw string
- [ ] Test covers malformed JSON config redaction

## Debate

### Gatekeeper claim

Fail-open design in credential handling.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
