# Debate-Driven Ticket System

This folder is the **single source of truth** for quality debates between:
- **Reviewer Agent (you / QA-PM role):** raises precise, testable concerns.
- **Claude Session (implementer role):** proposes fixes, disputes assumptions, and provides evidence.

Use this process to resolve contradictory opinions with discipline instead of ad-hoc chat.

## Goals
1. Make every disagreement explicit and auditable.
2. Force claims to include evidence (tests, logs, reproducible steps, code refs).
3. Prevent unresolved ambiguity from silently entering the codebase.
4. Build better reasoning over time via postmortems.
5. Shorten resolution time without sacrificing correctness.

## Folder Layout
- `INDEX.md`: active queue with ownership, priority, and aging.
- `tickets/`: active tickets and template.
- `archive/`: closed tickets moved here after final resolution.
- `meta/`: process records, improvement notes, rejection taxonomy, metrics, and audits.
- `meta/AUDIT-RUNBOOK.md`: standard checklist/cadence for process audits.
- `meta/audits/`: timestamped audit reports (`AUDIT-YYYYMMDD.md`).
- `scripts/validate-ticket.sh`: lightweight ticket quality gate.
- `scripts/init-collab-ticket.sh`: bootstrap ticket + branch/report hints.
- `scripts/run-agent-cycle.sh`: role-based cycle runner for Codex/Claude.
- `ops/REPO-BRANCH-PLAN.md`: branch strategy for parallel collaboration.
- `ops/HANDOFF-PROTOCOL.md`: autonomous hands-off operating loop.
- `reports/`: Codex/Claude report templates and per-ticket outputs.

## Ticket Lifecycle (Strict)

### Status values
Use exactly one status at a time in each ticket header:
- `OPEN` - ticket created, not yet addressed.
- `IN_PROGRESS` - Claude is actively working.
- `ARGUE` - active disagreement; evidence exchange required.
- `BLOCKED` - waiting on external dependency/decision.
- `RESOLVED` - accepted as fixed and verified.
- `REJECTED` - claim invalid; rejected with proof.
- `DEFERRED` - valid but intentionally postponed.

### State transition rules
- `OPEN -> IN_PROGRESS` only by Claude, with an implementation plan.
- `IN_PROGRESS -> RESOLVED` only after tests/checks + reviewer verification steps are documented.
- `IN_PROGRESS -> ARGUE` when Claude disputes ticket assumptions or severity.
- `ARGUE -> RESOLVED` if evidence supports fix and reviewer accepts.
- `ARGUE -> REJECTED` if ticket claim is disproven.
- `ANY -> BLOCKED` only with clear unblock condition and owner/date.
- `RESOLVED/REJECTED/DEFERRED -> archive/` after closure summary is complete.

### SLA / Response-time rules
- `OPEN` tickets must be acknowledged within **24 hours**.
- `IN_PROGRESS` tickets must post an update at least every **48 hours**.
- `ARGUE` tickets must reach either `RESOLVED`, `REJECTED`, or arbitration decision within **72 hours**.
- `BLOCKED` tickets must include `Unblock owner`, `Unblock action`, and `Target unblock date`.

## Burden of Proof (Mandatory)
- **Ticket author burden:** provide reproducible evidence that a defect/risk exists.
- **Challenger burden:** provide direct contradictory evidence (test/log/repro), not speculation.
- **Closure burden:** final decision must include evidence trail proving the claim disposition.

If any claim/counterclaim lacks evidence, status remains `ARGUE` and ticket cannot close.

## Required Debate Procedure
Each ticket must include these sections and be updated in place:
1. **Claim** (what is wrong).
2. **Impact** (user/system risk).
3. **Evidence** (tests, logs, repro steps).
4. **Counterargument** (Claude’s disagreement, if any).
5. **Rebuttal** (reviewer response with stronger evidence).
6. **Decision** (why resolved/rejected/deferred).
7. **Follow-ups** (new tickets if needed).

## Arbitration Protocol (Tie-breaker)
Trigger arbitration if either condition is true:
- Debate exceeds **2 full rebuttal rounds** without convergence.
- Ticket stays in `ARGUE` longer than **72 hours**.

Arbitration steps:
1. Assign a neutral decision owner.
2. Define one minimal decisive experiment.
3. Record exact command(s), environment, and expected outcomes.
4. Execute and attach artifacts.
5. Apply result to final decision and close with rationale.

## Roles and Responsibilities
### Reviewer Agent (QA/PM)
- Write high-signal, falsifiable tickets.
- Define acceptance criteria before implementation starts.
- Request missing evidence and challenge weak reasoning.
- Only accept `RESOLVED` when criteria are met.

### Claude Session (Implementer)
- Acknowledge ticket and set `IN_PROGRESS`.
- Provide a concise implementation plan before edits.
- If disagreeing, switch to `ARGUE` and provide counter-evidence.
- Never mark `RESOLVED` without verification notes and exact commands.

## Evidence Standard
Accepted evidence types (prefer multiple):
- Repro commands with expected vs actual output.
- Automated test results.
- Runtime logs with timestamps.
- Code references (file + lines).
- UI evidence (screenshots) when visual behavior is affected.
- Before/after checks that demonstrate causality.

Weak evidence (not sufficient alone):
- “Works for me.”
- Untested assumptions.
- Partial logs without repro context.
- Claims without reproducible environment details.

## Severity Rubric
- **P0:** production outage/data loss/security impact. Fix before release; continuous updates every 4h.
- **P1:** major user workflow broken, no acceptable workaround. Fix in current sprint/release.
- **P2:** moderate issue with workaround; quality degradation. Prioritize next iteration.
- **P3:** minor issue/documentation polish. Backlog candidate.

## Quality Gates
Before a ticket can move to `RESOLVED` or `REJECTED`, all must be true:
- Acceptance criteria are explicitly checked.
- Before/after evidence exists for the same scenario.
- Decision quality checklist is complete.
- `INDEX.md` row is current.

Optional lightweight check:
- `./debate/scripts/validate-ticket.sh debate/tickets/TKT-*.md`

## Naming Convention
New ticket filename:
`TKT-YYYYMMDD-<short-slug>.md`

Example:
`TKT-20260307-auth-timeout-handling.md`

## Codex ↔ Claude Automation Workflow
- Initialize a collaboration ticket with:
  - `./debate/scripts/init-collab-ticket.sh <YYYYMMDD> <short-slug> [P1]`
- Start a role cycle with:
  - Codex: `./debate/scripts/run-agent-cycle.sh codex <ticket-id>`
  - Claude: `./debate/scripts/run-agent-cycle.sh claude <ticket-id>`
- Follow branch policy in `ops/REPO-BRANCH-PLAN.md`.
- Follow autonomous loop in `ops/HANDOFF-PROTOCOL.md`.
- Store role reports under `reports/codex/` and `reports/claude/`.

## Operating Rules
- One ticket = one primary claim.
- Keep debate in the ticket file; do not split reasoning across chats.
- Append updates chronologically under the debate log.
- If scope expands, create linked child tickets.
- Prefer rejection with proof over vague “maybe fixed.”
- Update `INDEX.md` whenever ticket status/owner/priority changes.
- Track rejected ticket patterns in `meta/rejection-taxonomy.md`.
- Review process KPIs weekly in `meta/metrics.md`.

## Quick Start
1. Copy `tickets/TEMPLATE.md` to a new `TKT-*.md` file.
2. Fill in claim, impact, and reproducible evidence.
3. Add the new ticket row in `INDEX.md`.
4. Claude updates status to `IN_PROGRESS` or `ARGUE`.
5. Iterate in ticket comments until evidence is decisive.
6. Use arbitration protocol when tie-break is required.
7. Run ticket validator script.
8. Close as `RESOLVED`, `REJECTED`, or `DEFERRED`.
9. Move file to `archive/` and log process lessons in `meta/process-improvements.md`.
10. Run/record an audit using `meta/AUDIT-RUNBOOK.md`.
