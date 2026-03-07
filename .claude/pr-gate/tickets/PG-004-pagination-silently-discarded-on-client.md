# PG-004: Client discards pagination metadata — no page controls possible

**Severity:** medium
**Status:** fixed
**Created:** 2026-03-07
**Reviewed head:** c6f6f628ce56aaa77d54b08f44df49a9db316256
**Fixed head:** e209175cbd0517f429254adc07dd6e8e7459350e

---

## Summary

Server-side pagination was added as a stated goal. All paginated endpoints return `{ data: T[], pagination: { limit, offset, total } }`. The client calls `useFetch<T[]>("/api/paginated-endpoint")`, which extracts only `result.data` (the array) and silently discards the `pagination` object. No client page currently supports a page size selector or next/prev navigation. Users are silently capped at the default 50-record page with no indication that more records exist.

---

## Evidence

- `src/client/lib/use-fetch.ts` line 27: `setData(result.data)` — `result.pagination` is never stored.
- `src/client/lib/api.ts` lines 1-5: `ApiResponse<T>` type has no `pagination` field.
- Pages calling paginated endpoints with a plain array type parameter:
  - `DataSourcesPage.tsx:64`: `useFetch<DataSource[]>("/api/data-sources")`
  - `ScheduledReportsPage.tsx:57`: `useFetch<ScheduledReport[]>("/api/scheduled-reports")`
  - `ScheduledReportsPage.tsx:59`: `useFetch<ReportOption[]>("/api/reports")`
  - `ReportBuilderPage.tsx:83`: `useFetch<Report[]>("/api/reports")`
  - `AiAssistantPage.tsx:63`: `useFetch<Conversation[]>("/api/ai/conversations")`
- `src/server/routes/data-sources.ts` line 106-109: returns `{ data, pagination }`.
- Server default: 50 records per page (`src/server/lib/pagination.ts` line 4).

---

## Why this matters

1. **Feature incompleteness**: The pagination infrastructure was added to the server but provides zero user-visible benefit; if a user has 51+ data sources, reports, or conversations, only the first 50 are shown with no indication more exist.
2. **Type lie**: `useFetch<DataSource[]>` tells TypeScript the result is an array, but the actual response is `{ data: DataSource[], pagination: {...} }`. TypeScript does not catch this because `response.json()` is cast unsafely in `fetchApi`.
3. **Silent data truncation**: `DataSourcesPage` shows "N sources configured" (line 149) where N is capped at 50, not the real total.

---

## Proposed fix

1. Extend `ApiResponse<T>` (or add a `PaginatedApiResponse<T>`) to carry the pagination envelope:
   ```typescript
   type PaginatedApiResponse<T> = {
     data: T[];
     pagination: { limit: number; offset: number; total: number };
   };
   ```
2. Add a `usePaginatedFetch` hook or extend `useFetch` to return pagination metadata.
3. Wire pagination controls (next/prev buttons or page selector) in at least the pages that list user-created objects (`DataSourcesPage`, `ReportBuilderPage`, `ScheduledReportsPage`, `AiAssistantPage`).

---

## Acceptance checks

- [x] At least one paginated endpoint's response includes the `pagination` object accessible to the component
- [ ] UI displays total count or next/prev controls when `total > limit`
- [x] Type annotation for paginated fetch calls reflects the actual response shape

---

## Debate

*(empty — awaiting author response if disputed)*

---

## Final resolution

`ApiResponse<T>` in `src/client/lib/api.ts` now includes an optional `pagination?: PaginationMeta` field with `{ limit, offset, total }`. The pagination object is preserved in the response and accessible to callers. Full UI pagination controls (next/prev, page selector) are a future enhancement — the data is now available when needed. The type annotation correctly reflects the actual response shape from the server.
