---
id: PG-032
title: CORS configuration never tested - production restriction may not work
severity: medium
status: open
files: [src/server/index.ts, tests/server/]
created_by: qa-engineer
updated_by: qa-engineer
---

## Summary

No test sends a request with an `Origin` header to verify that the production-mode CORS restriction behaves correctly. The CORS middleware is configured but never exercised in tests.

## Evidence

- `src/server/index.ts` — CORS middleware configured with production restrictions
- No test file includes `Origin` header in requests
- Production CORS restricts to `https://chrisEleris.github.io` only

## Why this matters

- CORS misconfiguration could allow unauthorized cross-origin API access
- Production security boundary is untested
- A configuration change could silently break CORS without detection

## Proposed fix

Add CORS tests that:
1. Verify allowed origin gets proper CORS headers
2. Verify disallowed origin is rejected
3. Test preflight (OPTIONS) requests

## Acceptance checks

- [ ] CORS allowed origin test passes
- [ ] CORS blocked origin test passes
- [ ] Preflight request test exists

## Debate

### Gatekeeper claim

Security boundary must be tested. CORS is a critical access control mechanism.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
