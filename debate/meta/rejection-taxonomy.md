# Rejection Taxonomy

Use this taxonomy whenever a ticket ends as `REJECTED`.

## Categories
- `bad-repro`: steps cannot reproduce claim.
- `env-mismatch`: behavior caused by incorrect environment/config.
- `not-a-bug`: system behavior matches documented/expected design.
- `wrong-severity`: issue exists but severity claim is materially overstated.
- `duplicate`: concern already tracked in another ticket.
- `insufficient-evidence`: claim lacks required burden-of-proof artifacts.

## Usage Rule
When setting final status to `REJECTED`, copy one category into:
- ticket `Decision` section (`Rejection taxonomy category` field), and
- weekly metrics snapshot (`meta/metrics.md`).

## Rejected Ticket Entry Template
- Ticket ID:
- Date:
- Rejection category:
- One-line rationale:
- Disproving evidence:
- Preventive action (if any):
