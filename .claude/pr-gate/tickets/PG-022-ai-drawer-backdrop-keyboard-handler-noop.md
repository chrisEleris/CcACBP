---
id: PG-022
title: AI Drawer mobile backdrop onKeyDown is a no-op - accessibility gap
severity: nit
status: open
files:
  - src/client/components/AiDrawer.tsx
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

The mobile backdrop overlay in `AiDrawer.tsx` has `onKeyDown={() => undefined}` as a placeholder. This means keyboard users (who tab to the backdrop) cannot dismiss the drawer with the keyboard. The element has `role="presentation"` which should suppress keyboard interactivity, but assigning a `role="presentation"` element an `onKeyDown` (even a no-op) is semantically inconsistent and flagged by accessibility linters.

## Evidence

- `src/client/components/AiDrawer.tsx:209-215`:
  ```tsx
  <div
    className="fixed inset-0 z-30 bg-black/40 md:hidden"
    onClick={onToggle}
    onKeyDown={() => undefined}
    role="presentation"
  />
  ```

## Why this matters

The `onKeyDown={() => undefined}` suggests a developer intended to add keyboard support but left it as a no-op. With `role="presentation"`, the element should not receive focus, so the `onKeyDown` is functionally dead. The pattern is misleading for maintainers and may trigger accessibility linters (Biome has `useKeyWithClickEvents` rule). The `<dialog>` element already handles Escape via browser native behavior.

## Proposed fix

Remove the `onKeyDown` prop entirely. The `<dialog>` element handles keyboard dismissal natively (Escape key). The backdrop `div` with `role="presentation"` should not have keyboard handlers.

## Acceptance checks

- [ ] `onKeyDown={() => undefined}` removed from backdrop div.
- [ ] Pressing Escape closes the drawer (via the `<dialog>` element's native behavior or an explicit handler on the dialog).
- [ ] Biome lint passes without `useKeyWithClickEvents` warning.

## Debate

### Gatekeeper claim

The no-op `onKeyDown` on a `role="presentation"` element is a dead code placeholder that misleads maintainers and may trigger accessibility linter warnings.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
