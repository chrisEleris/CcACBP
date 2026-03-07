# Debate System Audit Runbook

Use this runbook to execute periodic audits of the debate-driven ticket process.

## Cadence
- Perform an audit weekly (or after major process changes).

## Scope
Audit the following artifacts:
- `debate/INDEX.md`
- active tickets in `debate/tickets/`
- closed tickets in `debate/archive/`
- `debate/meta/metrics.md`
- `debate/meta/rejection-taxonomy.md`

## Audit Checklist
- [ ] All active tickets in `tickets/` are represented in `INDEX.md`.
- [ ] `Status`, `Owner`, `Priority`, and `Last Updated` fields are current.
- [ ] No ticket in `ARGUE` exceeds 72h without arbitration details.
- [ ] No ticket closed without before/after evidence markers.
- [ ] `REJECTED` tickets include a taxonomy category.
- [ ] SLA breaches are reflected in `INDEX.md` and weekly metrics.
- [ ] Ticket validator passes for sampled tickets.

## Commands
- List tracked debate files:
  - `rg --files debate`
- Validate ticket structure:
  - `./debate/scripts/validate-ticket.sh debate/tickets/*.md`
- Optional archive sampling:
  - `./debate/scripts/validate-ticket.sh debate/archive/*.md`

## Audit Output
Create one file per audit in `debate/meta/audits/`:
`AUDIT-YYYYMMDD.md`

Required sections:
1. Scope + date/time
2. Findings (pass/fail per checklist item)
3. Defects discovered
4. Corrective actions and owners
5. Due dates
