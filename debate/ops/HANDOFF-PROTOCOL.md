# User Hands-off Protocol (Codex + Claude Autonomous Loop)

This protocol defines how Codex and Claude can continue work with minimal user intervention.

## Trigger
A ticket exists in `debate/tickets/` with status `OPEN`.

## Autonomous Loop
1. **Codex cycle**
   - Switch to `codex/audit/<ticket-id>`.
   - Reproduce issue and gather failing evidence.
   - Update ticket sections: Claim/Impact/Reproduction/Evidence/Debate.
   - Produce report: `debate/reports/codex/<ticket-id>-audit.md`.
   - Set status to `IN_PROGRESS` or `ARGUE` as appropriate.

2. **Claude cycle**
   - Switch to `claude/fix/<ticket-id>`.
   - Read ticket + Codex report.
   - Implement fix or counterargument.
   - Run tests and update evidence.
   - Produce report: `debate/reports/claude/<ticket-id>-fix.md`.
   - Update ticket status (`IN_PROGRESS`, `ARGUE`, or `RESOLVED`).

3. **Codex verification cycle**
   - Re-run failing scenario and regression checks.
   - Confirm evidence quality gates.
   - If accepted: mark `RESOLVED`; else set `ARGUE` with rebuttal.

4. **Closure / archive**
   - If `RESOLVED`, move ticket to `debate/archive/` and update `INDEX.md`.
   - Record KPI and audit impacts in `debate/meta/metrics.md`.

## Escalation (No User Needed Unless Blocked)
- Trigger arbitration automatically when:
  - 2 rebuttal rounds completed without convergence, or
  - 72h in `ARGUE`.
- Execute decisive experiment and use result as tie-break.

## Required Outputs Per Ticket
- Ticket file updates in `debate/tickets/` or `debate/archive/`.
- Codex report in `debate/reports/codex/`.
- Claude report in `debate/reports/claude/`.
- Updated `debate/INDEX.md` row.
