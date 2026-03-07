# PG-001: Client has no mechanism to send API key in production

**Severity:** high
**Status:** open
**Created:** 2026-03-07
**Reviewed head:** c6f6f628ce56aaa77d54b08f44df49a9db316256

---

## Summary

The server introduces `API_KEY` authentication middleware that blocks all `/api/*` requests without a valid key. However, neither `fetchApi` in `src/client/lib/api.ts`, `useFetch` in `src/client/lib/use-fetch.ts`, nor any direct `fetch()` calls in page components ever send an `X-API-Key` or `Authorization` header. The client has no way to inject credentials. When `API_KEY` is configured in production, every API call from the browser will receive 401 and the app becomes non-functional.

---

## Evidence

- `src/server/middleware/auth.ts` lines 32-48: auth is required when `config.API_KEY` is set, checks `X-API-Key` and `Authorization: Bearer`.
- `src/client/lib/api.ts` lines 7-13 and 33-43: `fetchApi` and `mutateApi` send no auth headers.
- `src/client/lib/use-fetch.ts` line 24: uses `fetchApi` with no headers.
- Direct `fetch()` calls in pages like `DataSourcesPage.tsx` lines 81, 103, 119; `AiAssistantPage.tsx` lines 105, 129, 167; `ScheduledReportsPage.tsx` lines 118, 139, 159, 175 — none pass any auth header.
- `src/server/entry.ts` lines 14-18: the warning is only printed; nothing wires credentials to the client bundle.
- `terraform/environments/prod/main.tf` lines 111-117: `API_KEY` is absent from the production environment variables block, yet the Dockerfile + entry serve both the SPA and the API.

---

## Why this matters

If an operator sets `API_KEY` (the documented path to securing the server in production), every browser request returns 401. The entire dashboard is dead. This is a functional regression that makes the security feature self-defeating.

---

## Proposed fix

Either:
1. Inject `VITE_API_KEY` at build time (acceptable only if the key is low-privilege), exposed via `import.meta.env.VITE_API_KEY`, and attach it in `fetchApi`/`mutateApi` headers. **Not recommended** for secrets.
2. Use session cookies or a login page that exchanges credentials for a session token. The API key is validated server-side and a cookie is issued.
3. Place the auth at the network layer (ALB/nginx), not in the app — then the browser never needs to send the key. The Terraform ALB module already exists.
4. If the intent is that `API_KEY` is only for programmatic callers (not the browser), document this explicitly and accept that the SPA works only when `API_KEY` is unset.

---

## Acceptance checks

- [ ] Either: `fetchApi`/`mutateApi` attach credentials from a runtime configuration source, OR
- [ ] Auth is moved to the network layer with the SPA on the same protected origin, OR
- [ ] Documentation clearly states the SPA is never used with `API_KEY` set and this is intentional

---

## Debate

*(empty — awaiting author response if disputed)*

---

## Final resolution

*(pending)*
