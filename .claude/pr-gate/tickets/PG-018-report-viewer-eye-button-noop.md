---
id: PG-018
title: Report Builder Eye button has no onClick handler - dead UI element
severity: low
status: open
files:
  - src/client/pages/ReportBuilderPage.tsx
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

The "View" button (Eye icon) on each saved report card in `ReportBuilderPage` has no `onClick` handler. Clicking it does nothing. The `viewingReportId` state in `App.tsx` and the `ReportViewerPage` component exist for this purpose, but the wiring is not completed in `ReportBuilderPage`.

## Evidence

- `src/client/pages/ReportBuilderPage.tsx:443-448`:
  ```tsx
  <button
    type="button"
    className="rounded-lg p-2 text-blue-400 ..."
    aria-label={`View ${report.name}`}
  >
    <Eye size={15} />
  </button>
  ```
  No `onClick` prop is present.
- `src/client/App.tsx:84` — `viewingReportId` state exists.
- `src/client/App.tsx:87-90` — `ReportViewerPage` is rendered when `viewingReportId` is set.
- `src/client/App.tsx:127` — `ReportBuilderPage` receives no `onViewReport` prop.

## Why this matters

The Eye button is visually prominent (blue accent color) and has an accessible label, suggesting users it is interactive. Clicking it silently does nothing, which is a broken UX expectation. This is a functional bug, not just cosmetic.

## Proposed fix

1. Pass an `onViewReport` callback from `App.tsx` to `ReportBuilderPage`:
   ```tsx
   <ReportBuilderPage onViewReport={setViewingReportId} />
   ```
2. Add `onViewReport: (id: string) => void` to `ReportBuilderPage`'s props.
3. Wire `onClick={() => onViewReport(report.id)}` to the Eye button.

## Acceptance checks

- [ ] Clicking the Eye button on a saved report navigates to `ReportViewerPage` for that report.
- [ ] The Back button in `ReportViewerPage` returns to the report list.
- [ ] No TypeScript errors.

## Debate

### Gatekeeper claim

The Eye button has an `aria-label` and a blue color suggesting it is interactive, but no `onClick` — it is a broken UI element. The wiring infrastructure (state in App.tsx) already exists.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
