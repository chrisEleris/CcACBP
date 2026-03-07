# Process Improvements Log

Use this file to evolve the debate system over time.

## Entry Template
- Date:
- Trigger ticket:
- Problem in process:
- Root cause:
- Improvement adopted:
- Expected measurable benefit:
- Verification date:

---

## Initial Baseline (v5)
- Mandated evidence-first debate on every contested claim.
- Strict status transitions to prevent ambiguous closure.
- SLA-based ticket handling to avoid stalled debates.
- Arbitration protocol for persistent disagreements.
- Ticket-local debate log to preserve full argument context.
- Explicit rejection path for disproven concerns.
- Required before/after validation evidence in every closure.
- Queue-level SLA breach visibility in `INDEX.md`.
- Lightweight ticket quality gate script (`scripts/validate-ticket.sh`).
- KPI tracking guidance in `meta/metrics.md`.

- Formal audit runbook and dated audit reports under `meta/audits/`.

- Autonomous Codex/Claude handoff protocol in `ops/HANDOFF-PROTOCOL.md`.
- Repo/branch collaboration plan in `ops/REPO-BRANCH-PLAN.md`.
- Role-cycle automation scripts for ticket bootstrap and agent execution.