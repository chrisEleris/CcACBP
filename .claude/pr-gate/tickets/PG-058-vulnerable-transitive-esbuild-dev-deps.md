---
id: PG-058
title: Transitive dev-dependency esbuild versions 0.18.20 and 0.21.5 are below the patched threshold
severity: low
status: open
files:
  - package.json
  - pnpm-lock.yaml
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`pnpm audit` reports a moderate vulnerability in `esbuild` (GHSA-67mh-4wv8-2f99: "esbuild enables any website to send any requests to the development server"). The patched version is `>=0.25.0`. While the direct `esbuild` devDependency is `^0.27.3` (safe), `pnpm-lock.yaml` shows two older transitive esbuild versions are installed: `0.18.20` and `0.21.5`, both pulled in by `drizzle-kit` via `@esbuild-kit/esm-loader` and `@esbuild-kit/core-utils`.

## Evidence

```
pnpm audit output:
│ moderate            │ esbuild enables any website to send any requests to    │
│                     │ the development server and read the response           │
│ Vulnerable versions │ <=0.24.2                                               │
│ Patched versions    │ >=0.25.0                                               │
│ Paths               │ .>drizzle-kit>@esbuild-kit/esm-loader>@esbuild-kit/   │
│                     │ core-utils>esbuild                                     │
│                     │ .>vitest>vite>esbuild                                  │
```

`pnpm-lock.yaml` confirms:
- `esbuild@0.18.20` — used by `drizzle-kit` transitive chain
- `esbuild@0.21.5` — used by `vite` (via `vitest`)
- `esbuild@0.25.12` and `0.27.3` — the safe versions

## Why this matters

The vulnerability allows a malicious webpage to make requests to the local esbuild development server (`localhost:...`) and read response data. This is a **dev-time only** vulnerability — the affected esbuild versions are not included in the production build artifact (`dist/`). The attack requires the developer to be running `pnpm dev` or drizzle-kit commands while simultaneously visiting a malicious webpage.

Severity is `low` (not `blocker` or `high`) because:
1. The production Docker image does not ship dev-only dependencies.
2. The affected tool is a dev/build CLI tool, not the application runtime.
3. Exploitation requires simultaneous dev-server access and malicious page visit.

However, it should be tracked and resolved to clear the `pnpm audit` output and prevent developer exposure.

## Proposed fix

1. Check if `drizzle-kit` has a newer release that no longer uses `@esbuild-kit` (which is deprecated in favor of `tsx`). Current `drizzle-kit@^0.31.9` — check latest.
2. If `vitest`/`vite` can be upgraded to a version that bundles esbuild `>=0.25.0`:
   ```
   pnpm update vite vitest
   ```
3. If neither is immediately available, add a `pnpm.overrides` entry to force the patched version:
   ```json
   "pnpm": {
     "overrides": {
       "esbuild": ">=0.25.0"
     }
   }
   ```
   Note: overrides may cause build breakage if the older API was relied upon.

## Acceptance checks

- [ ] `pnpm audit` reports no `moderate` or higher vulnerabilities related to `esbuild`.
- [ ] `pnpm test` and `pnpm build` still pass after the update.

## Debate

_Not yet provided._

## Final resolution

Pending.
