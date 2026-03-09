---
id: PG-036
title: SettingsPage Save button is completely non-functional
severity: medium
status: open
files: [src/client/pages/SettingsPage.tsx]
created_by: principal-engineer
updated_by: principal-engineer
---

## Summary

Integration form inputs in SettingsPage have no `value` prop and no `onChange` handler. The Save button has no `onClick`. Clicking Save does nothing. A user entering AWS credentials sees no feedback and finds fields empty on next visit.

## Evidence

- `src/client/pages/SettingsPage.tsx:113-132` — Form inputs without controlled state, Save button without onClick

## Why this matters

- Users entering credentials get no feedback that nothing was saved
- In an operations dashboard, non-functional forms destroy trust
- Could lead to users thinking credentials are stored when they aren't

## Proposed fix

Either wire the form properly with controlled inputs and POST to `/api/connectors`, or replace with explicit notice about env var configuration.

## Acceptance checks

- [ ] Save button either works or is disabled with explanation
- [ ] Form inputs are either controlled or explicitly read-only
- [ ] User gets clear feedback about configuration method

## Debate

### Gatekeeper claim

Non-functional forms in a security-sensitive dashboard are a usability and trust issue.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
