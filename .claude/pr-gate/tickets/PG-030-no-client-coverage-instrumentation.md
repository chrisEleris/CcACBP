---
id: PG-030
title: Client-side code has zero coverage instrumentation
severity: medium
status: open
files: [vitest.config.ts, src/client/]
created_by: qa-engineer
updated_by: qa-engineer
---

## Summary

The `vitest.config.ts` coverage `include` only covers `src/server/**/*.ts`. Every file in `src/client/` is invisible to the coverage reporter, meaning client-side code quality cannot be measured.

## Evidence

- `vitest.config.ts:28` — Coverage include only lists `src/server/**/*.ts`
- No page component in `src/client/pages/` has any tests
- `src/client/lib/use-fetch.ts` — Hook logic never executed in tests

## Why this matters

- Cannot measure client-side code quality
- Page components (20+ files) are completely untested
- Bugs in client-side logic go undetected

## Proposed fix

1. Add `src/client/**/*.{ts,tsx}` to coverage include in `vitest.config.ts`
2. Exclude fixture files from coverage
3. Gradually add component tests for critical pages

## Acceptance checks

- [ ] Coverage config includes client-side code
- [ ] Coverage report shows client file metrics
- [ ] No false positives from fixture files

## Debate

### Gatekeeper claim

Half the codebase has no coverage visibility. This is a significant blind spot.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
