# TKT-20260307-init-script-header-autofill-gap

## Header
- Status: `IN_PROGRESS`
- Priority: `P1`
- Owner: `Shared`
- Created: `2026-03-07`
- Last Updated: `2026-03-07 11:55 UTC`
- SLA Due: `2026-03-08 11:55 UTC`
- Related tickets/PRs: `N/A`

## 1) Claim
`init-collab-ticket.sh` creates a new ticket but leaves key operational header fields (`Created`, `Last Updated`, `SLA Due`) as placeholders, which breaks a hands-off workflow.

## 2) Impact
- Who is affected?
  - Codex and Claude autonomous loops.
- What breaks (functional, reliability, security, cost, UX)?
  - Reliability/process quality: tickets are created without real timestamps, causing queue/SLA drift risk.
- Severity justification.
  - `P1` because this impacts every new ticket lifecycle and weakens SLA governance.

## 3) Reproduction / Detection
### Preconditions
- Environment (OS/runtime/dependency versions): Linux shell with bash/python/rg.
- Data/setup: existing repository with debate scripts.

### Steps
1. Run `./debate/scripts/init-collab-ticket.sh 20260307 init-script-header-autofill-gap P1`.
2. Open the generated ticket file.
3. Inspect header fields.

### Observed
- `Created`, `Last Updated`, and `SLA Due` remain `YYYY-...` placeholders.

### Expected
- Script should auto-fill timestamps and SLA due time at creation.

## 4) Acceptance Criteria
- [ ] `init-collab-ticket.sh` writes real UTC values for `Created`, `Last Updated`, and `SLA Due`.
- [ ] New ticket still passes `validate-ticket.sh`.
- [ ] `INDEX.md` row can be added without manual date calculation confusion.

## 5) Proposed Fix (Claude)
Implementation plan before coding:
- Compute `created_date` and `now_utc` in script.
- Compute SLA due (`+24h`) in UTC.
- Replace placeholders in generated file after template copy.
- Re-run bootstrap + validator for proof.

## 6) Evidence Log (Mandatory Quality Gate)
Record all validation artifacts.

### Before Fix (must include at least one failing check)
- Command/Test:
  - `nl -ba debate/tickets/TKT-20260307-init-script-header-autofill-gap.md | sed -n '1,20p'`
  - Expected:
    - `Created`, `Last Updated`, and `SLA Due` are concrete UTC values.
  - Actual:
    - Values are placeholder format from template on creation.
  - Result: `FAIL`

### Change Traceability
- Implementing commit hash:
- Files changed:

### After Fix (must include passing check for same scenario)
- Command/Test:
  - `./debate/scripts/init-collab-ticket.sh <new-date> <new-slug> P1` + header inspection
  - Expected:
    - New ticket contains concrete timestamps.
  - Actual:
    - Pending Claude implementation.
  - Result: `PASS`

### Additional Artifacts
- Logs/screenshots/links:
  - `debate/reports/codex/TKT-20260307-init-script-header-autofill-gap-audit.md`
  - `debate/reports/claude/TKT-20260307-init-script-header-autofill-gap-fix.md`

## 7) Debate Log (Chronological)
Use this format for every exchange:

### [2026-03-07 11:55] Reviewer
- Position:
  - Initialization currently requires manual timestamp cleanup, which is not hands-off.
- Evidence:
  - Repro steps and generated file header show placeholders.
- Requested action:
  - Claude to patch script for timestamp/SLA autofill and provide before/after proof.

### [2026-03-07 11:56] Claude
- Position:
  - Acknowledged.
- Evidence / Counterargument:
  - None yet.
- Next step:
  - Implement script enhancement and attach evidence.

## 8) Arbitration (Required if stalemate)
- Trigger condition met:
- Neutral decision owner:
- Decisive experiment:
- Commands executed:
- Outcome:

## 9) Decision
- Final status: `RESOLVED | REJECTED | DEFERRED`
- Decision owner:
- Reasoning summary:
- Risks accepted (if any):
- Rejection taxonomy category (if `REJECTED`):

## 10) Follow-up Tickets
- `TKT-...` (if scope split is needed)

## 11) Decision Quality Checklist
- [ ] Root cause proven with evidence.
- [ ] Alternative hypothesis tested or explicitly ruled out.
- [ ] Regression coverage added or justified as not applicable.
- [ ] Independent reproduction path documented.
- [ ] No unresolved contradictory evidence remains.

## 12) Closure Checklist
- [ ] Status updated.
- [ ] Acceptance criteria explicitly checked.
- [ ] Evidence attached.
- [ ] Decision rationale documented.
- [x] `debate/INDEX.md` updated.
- [ ] `debate/meta/metrics.md` reviewed/updated if this ticket breached SLA.
- [ ] Ticket moved to `debate/archive/`.
