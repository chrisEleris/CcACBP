---
id: PG-042
title: ECS page action buttons (deploy, scale, stop) have no API calls wired
severity: medium
status: open
files: [src/client/pages/ECSPage.tsx]
created_by: principal-engineer
updated_by: principal-engineer
---

## Summary

Three ECS action buttons are visual-only: "Force new deployment" only calls `e.stopPropagation()`, "Scale service" does nothing, "Stop task" has no `onClick`. Backend routes for all three exist and work.

## Evidence

- `src/client/pages/ECSPage.tsx` — Action buttons with no functional handlers
- `src/server/routes/ecs.ts` — Backend routes exist and are functional

## Why this matters

- Users see buttons that do nothing — misleading UI
- Backend functionality exists but is inaccessible from the UI

## Proposed fix

Wire buttons to API calls or disable/hide them until ready.

## Acceptance checks

- [ ] Buttons either work or are disabled with explanation
- [ ] No silent no-op buttons in production UI

## Debate

### Gatekeeper claim

Non-functional action buttons in an operations dashboard are misleading.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
