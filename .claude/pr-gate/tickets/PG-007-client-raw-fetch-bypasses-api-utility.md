# PG-007: Multiple pages use raw fetch() instead of fetchApi/mutateApi utility

**Severity:** low
**Status:** fixed
**Created:** 2026-03-07
**Reviewed head:** c6f6f628ce56aaa77d54b08f44df49a9db316256
**Fixed head:** e209175cbd0517f429254adc07dd6e8e7459350e

---

## Summary

The codebase introduces centralized `fetchApi` and `mutateApi` utilities in `src/client/lib/api.ts`, but several page components bypass them with direct `fetch()` calls. This creates inconsistency: any future enhancement to the central utilities (e.g. injecting auth headers per PG-001, request deduplication, error normalization) will silently not apply to the bypass callers.

---

## Evidence

Raw `fetch()` calls that bypass `mutateApi`:
- `DataSourcesPage.tsx` lines 81, 103, 119 — POST, POST, DELETE
- `AiAssistantPage.tsx` lines 105 (GET), 129 (POST), 167 (POST)
- `QueryExplorerPage.tsx` lines 54 (GET), 87 (POST), 109 (POST), 137 (DELETE)
- `ReportBuilderPage.tsx` lines 108 (POST), 140 (POST/PUT), 191 (DELETE)
- `ReportViewerPage.tsx` line 103 (POST)
- `ScheduledReportsPage.tsx` lines 118 (POST/PUT), 139 (PUT), 159 (POST), 175 (DELETE)

---

## Why this matters

1. **PG-001 dependency**: Fixing PG-001 (API key injection) requires modifying only `fetchApi`/`mutateApi`. If raw `fetch()` calls remain, those mutations will still fail with 401 in production.
2. **Error handling inconsistency**: `fetchApi` throws on non-OK responses; raw `fetch()` callers each re-implement this check with varying patterns.
3. **Code duplication**: Error-handling boilerplate is repeated across each component.

---

## Proposed fix

Replace all raw `fetch()` calls with `fetchApi` (for GET) or `mutateApi` (for POST/PUT/DELETE). This should be a mechanical refactor.

Example:
```typescript
// Before
const response = await fetch("/api/data-sources", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(form),
});
if (!response.ok) throw new Error(...);

// After
await mutateApi("/api/data-sources", "POST", form);
```

---

## Acceptance checks

- [x] No raw `fetch()` calls remain in `src/client/pages/` that bypass `fetchApi`/`mutateApi`
- [x] All mutation callers use `mutateApi`
- [x] All GET callers use `fetchApi` or `useFetch`

---

## Debate

*(empty — awaiting author response if disputed)*

---

## Final resolution

All raw `fetch()` calls in client pages and components replaced with `fetchApi`/`mutateApi`. Updated files: `DataSourcesPage.tsx`, `AiAssistantPage.tsx`, `QueryExplorerPage.tsx`, `ReportBuilderPage.tsx`, `ReportViewerPage.tsx`, `ScheduledReportsPage.tsx`, `AiDrawer.tsx`. Each file now imports from `../lib/api` and uses the centralized utilities, ensuring auth headers from PG-001 are consistently applied.
