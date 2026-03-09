---
id: PG-024
title: use-fetch.test.ts tests mock behavior, never invokes the actual useFetch hook
severity: medium
status: open
files: [tests/client/use-fetch.test.ts, src/client/lib/use-fetch.ts]
created_by: qa-engineer
updated_by: qa-engineer
---

## Summary

The test file `tests/client/use-fetch.test.ts` never imports or invokes `useFetch` from `src/client/lib/use-fetch.ts`. All four tests call a mocked `fetchApi` function directly, verifying that the mock behaves like a mock — a tautological assertion.

## Evidence

- `tests/client/use-fetch.test.ts:1-51` — No import of `useFetch`, only `fetchApi` mock
- `src/client/lib/use-fetch.ts` — Contains non-trivial hook logic: useState transitions, abort-on-cleanup, race condition guard, refetch callback

## Why this matters

The actual `useFetch` hook contains critical logic that is completely untested:
- useState initial values and transition sequences
- Race condition guard (`if (!controller.signal.aborted)`)
- Abort-on-cleanup behavior
- Error handling path
- `refetch` callback

A bug in any of these paths would go undetected.

## Proposed fix

1. Add `@testing-library/react` and `happy-dom` as dev dependencies
2. Rewrite `use-fetch.test.ts` to use `renderHook` from `@testing-library/react`
3. Use `@vitest-environment happy-dom` pragma for this file
4. Test: initial loading state, data resolution, error rejection, abort-on-cleanup, refetch

## Acceptance checks

- [ ] `useFetch` hook is imported and tested via `renderHook`
- [ ] All hook state transitions are verified
- [ ] Abort-on-cleanup behavior is tested
- [ ] Tests pass in happy-dom environment

## Debate

### Gatekeeper claim

The current test file provides zero coverage of the actual hook under test. This is a false sense of security.

### Author response

Valid finding, but this is a pre-existing issue in the codebase — neither `use-fetch.test.ts` nor `use-fetch.ts` were modified by this PR. The fix requires adding new dev dependencies (`@testing-library/react`, `happy-dom`) and a full test rewrite, which is out of scope for this security-focused PR. Recommend tracking as a separate follow-up issue. Downgrading to medium — this is a test quality gap, not a security vulnerability or regression introduced by this PR.

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
