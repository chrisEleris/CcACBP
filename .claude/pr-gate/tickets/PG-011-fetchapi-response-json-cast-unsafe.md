---
id: PG-011
title: fetchApi and mutateApi cast response.json() to typed generics without runtime validation
severity: medium
status: fixed
files:
  - src/client/lib/api.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

Both `fetchApi<T>` and `mutateApi<T>` in `src/client/lib/api.ts` cast the response body with `response.json() as Promise<ApiResponse<T>>`. This is a TypeScript compile-time assertion only — there is no runtime validation that the server actually returned the expected shape. If the server returns a different structure (e.g., an HTML error page, a partial response, or a schema-changed payload), the application silently receives mistyped data.

## Evidence

- `src/client/lib/api.ts:12` — `return response.json() as Promise<ApiResponse<T>>;`
- `src/client/lib/api.ts:43` — `return response.json() as Promise<ApiResponse<T>>;`
- The `ApiResponse<T>` type in `api.ts:1-5` is a local re-declaration (not the same as `src/shared/types.ts:5`) with an additional `error?: string` field.
- `src/client/lib/use-fetch.ts:27` — `setData(result.data)` — if `result.data` is undefined (e.g., server returned `{ message: "error" }` with status 200), this silently sets `data` to `undefined` and the UI renders no content with no error.

## Why this matters

The `as` cast provides false type safety. Any server response shape mismatch causes runtime errors that TypeScript cannot detect. The CLAUDE.md standards require "Use Zod for runtime validation of external data" (`§3.1`) but this is violated here. Combined with the `error?: string` field in the local `ApiResponse` type (which differs from the shared type), there is potential for the `error` field to be silently ignored.

## Proposed fix

1. Use the shared `ApiResponse<T>` type from `src/shared/types.ts` instead of the locally redeclared version in `api.ts`.
2. Add a Zod schema for at minimum the `ApiResponse` envelope and validate the response at runtime, or use an unknown cast + type guard:
   ```ts
   const raw: unknown = await response.json();
   // narrow or validate before returning
   ```
3. In `use-fetch.ts`, handle the case where `result.data` is `undefined` (e.g., when the server returns an error body with status 200).

## Acceptance checks

- [ ] `fetchApi` performs at minimum a structural check that `data` is present in the response body.
- [ ] The local `ApiResponse` type in `api.ts` is removed or aligned with `src/shared/types.ts`.
- [ ] `useFetch` sets an error state when `result.data` is undefined.

## Debate

### Gatekeeper claim

`as Promise<ApiResponse<T>>` is a bare type assertion with no runtime verification. CLAUDE.md explicitly requires Zod for runtime validation of external data. The local `ApiResponse` type diverges from the shared type, creating a maintenance hazard.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
