---
id: PG-012
title: Client-side routing uses React state instead of the browser URL - breaks deep links and refresh
severity: medium
status: open
files:
  - src/client/App.tsx
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

The application implements navigation by storing the current path in React state (`useState("/")`). The browser URL never changes as the user navigates between pages. This means: refreshing the page always returns to `/`, links cannot be shared to specific pages, the browser back/forward buttons do not work for in-app navigation, and the `viewingReportId` state is also lost on refresh.

## Evidence

- `src/client/App.tsx:81` — `const [currentPath, setCurrentPath] = useState("/");`
- `src/client/App.tsx:86-136` — `renderPage()` switches on `currentPath` from state, never reads `window.location`.
- `src/client/App.tsx:158-163` — `onNavigate={(path) => { setCurrentPath(path); ... }}` — navigation changes state only.
- `src/server/entry.ts:10` — the server has an SPA fallback `serveStatic({ path: "index.html" })` for all non-API routes, which correctly supports URL-based routing — but the client never uses it.
- There is no `react-router-dom`, no hash router, and no `History API` usage anywhere in the client.

## Why this matters

This is a functional regression relative to user expectations for an SPA dashboard. Operators cannot bookmark specific pages (e.g., `/reports`, `/ec2`). Sharing a link to a specific page is impossible. The browser navigation history only tracks the initial page load. This is particularly impactful for a monitoring dashboard where operators are likely to bookmark specific resource pages.

## Proposed fix

1. Use the `History API` (`window.location.pathname` + `window.history.pushState`) or install `react-router-dom` (already not in dependencies — would be a new addition).
2. A minimal fix without adding a dependency: initialize `currentPath` from `window.location.pathname`, call `window.history.pushState({}, "", path)` on navigation, and listen to `popstate` for the back button.
3. A more complete fix: add `react-router-dom` and use `<BrowserRouter>` + `<Routes>`.

## Acceptance checks

- [ ] Navigating to `/ec2` and refreshing the page renders the EC2 page, not the dashboard.
- [ ] The browser back button navigates to the previously viewed page.
- [ ] Direct URL navigation to `/reports` works.

## Debate

### Gatekeeper claim

State-based routing is a concrete functional gap: refresh returns to root, back button does nothing, and bookmarking any page is impossible. The server-side SPA fallback is wired up correctly but unused because the client never changes the URL.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
