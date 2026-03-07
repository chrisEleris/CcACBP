---
reviewed_head: "c6f6f628ce56aaa77d54b08f44df49a9db316256"
overall_status: "fail"
open_blocker_high: 1
open_total: 8
updated_by: "pr-gatekeeper"
---

## What was reviewed

Branch `claude/dev` against `origin/main`. The PR contains 143 changed files with 24,830 insertions and 719 deletions. Major additions include:

- API key authentication middleware (`src/server/middleware/auth.ts`)
- CORS hardening and body size limits (`src/server/index.ts`)
- Server-side pagination utility (`src/server/lib/pagination.ts`)
- Credential redaction for data source config (`src/server/routes/data-sources.ts`)
- React.lazy + Suspense code splitting (`src/client/App.tsx`)
- Accessibility improvements (skip links, aria labels, keyboard nav)
- New routes: AI, ECS, Jenkins, Deployments, Reports, Scheduled Reports, Query, Data Sources
- New DB schema with 8 tables + a split `schema-scheduled.ts`
- Terraform infrastructure modules
- 383 tests across 22 test files (all passing)
- TypeScript and lint checks passing (zero errors)

## Ticket summary

| ID | Severity | Status | Title |
|----|----------|--------|-------|
| PG-001 | high | open | Client has no mechanism to send API key in production |
| PG-002 | medium | open | Timing side-channel leaks API key length in safeCompare |
| PG-003 | medium | open | scheduledReports table missing from Drizzle schema object |
| PG-004 | medium | open | Client discards pagination metadata — no page controls possible |
| PG-005 | low | open | Pagination all-or-nothing fallback resets valid offset |
| PG-006 | low | open | Report execution stub uses Math.random() for persisted values |
| PG-007 | low | open | Multiple pages use raw fetch() instead of fetchApi/mutateApi |
| PG-008 | low | open | Cron expression validation allows semantically invalid ranges |

**Counts by severity:**
- high: 1 open
- medium: 3 open
- low: 4 open
- blocker: 0

**Counts by status:**
- open: 8
- fixed: 0
- rejected: 0

## PR creation status

**BLOCKED.** PG-001 is `high` severity and `open`. The client has no mechanism to send the API key that the server now requires in production. If `API_KEY` is set, every browser API call returns 401 and the application is non-functional. This makes the security hardening self-defeating.

Additionally, PG-002 (timing side-channel), PG-003 (incomplete schema registration), and PG-004 (pagination data silently truncated) are `medium` severity and must be addressed before merge.

## Positive observations

- Credential redaction (`redactConfig`) is correctly implemented and well-tested.
- `timingSafeEqual` is used from `node:crypto` (correct direction).
- Body size limit (1MB) applied globally to `/api/*`.
- CORS correctly restricts to GitHub Pages origin in production.
- 383 tests all pass with no flaky failures observed.
- No `any` types in source files.
- TypeScript strict mode enabled; `tsc --noEmit` clean.
- Biome lint clean.
- Pagination logic is correctly implemented server-side with Zod validation.
