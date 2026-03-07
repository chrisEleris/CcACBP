# Repo / Branch Plan for Codex ↔ Claude Collaboration

## Objectives
- Allow Codex and Claude to operate asynchronously with minimal user interaction.
- Keep audit/debate artifacts versioned and traceable.
- Prevent branch collisions and unclear ownership.

## Branch Model
- `main` (or project default): protected integration branch.
- `codex/audit/<ticket-id>`: Codex investigation, test evidence, debate updates, and audit notes.
- `claude/fix/<ticket-id>`: Claude implementation/fix branch for code changes.
- `sync/<ticket-id>` (optional): reconciliation branch if both sides need combined changes before PR.

## Ticket-to-Branch Mapping
Given `TKT-YYYYMMDD-short-slug.md`:
- Codex branch: `codex/audit/TKT-YYYYMMDD-short-slug`
- Claude branch: `claude/fix/TKT-YYYYMMDD-short-slug`

## Ownership Rules
- Codex owns:
  - ticket claim quality
  - reproducibility
  - failure evidence
  - audit/test reports in `debate/reports/codex/`
- Claude owns:
  - proposed/implemented fix
  - post-fix validation
  - implementation reports in `debate/reports/claude/`

## Merge Strategy
1. Codex opens/updates ticket + evidence on `codex/audit/*`.
2. Claude cherry-picks or merges ticket artifact commits into `claude/fix/*`.
3. Claude implements fix + tests + report.
4. Codex reviews on `codex/audit/*` (or `sync/*`) and either:
   - accepts (`RESOLVED`) or
   - disputes (`ARGUE`) with new evidence.
5. Final PR to protected branch includes:
   - code diff (if any)
   - ticket file
   - codex + claude reports

## Conflict Resolution
- If ticket file conflicts, preserve both entries chronologically in Debate Log.
- If evidence conflicts, trigger arbitration in ticket section 8 and run one decisive experiment.

## Required Commit Prefixes
- Codex: `audit:`
- Claude: `fix:`
- Shared workflow/process: `process:`
