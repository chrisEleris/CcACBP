#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <codex|claude> <ticket-id>" >&2
  exit 2
fi

role="$1"
ticket_id="$2"
ticket_path="debate/tickets/${ticket_id}.md"

if [[ ! -f "$ticket_path" ]]; then
  echo "Missing ticket: $ticket_path" >&2
  exit 1
fi

case "$role" in
  codex)
    report="debate/reports/codex/${ticket_id}-audit.md"
    template="debate/reports/TEMPLATE-CODEX-AUDIT.md"
    branch="codex/audit/${ticket_id}"
    ;;
  claude)
    report="debate/reports/claude/${ticket_id}-fix.md"
    template="debate/reports/TEMPLATE-CLAUDE-FIX.md"
    branch="claude/fix/${ticket_id}"
    ;;
  *)
    echo "Invalid role: $role (expected codex|claude)" >&2
    exit 2
    ;;
esac

mkdir -p "$(dirname "$report")"
if [[ ! -f "$report" ]]; then
  cp "$template" "$report"
  sed -i "s/<ticket-id>/${ticket_id}/g" "$report"
fi

./debate/scripts/validate-ticket.sh "$ticket_path"

cat <<MSG
[$role cycle ready]
- Ticket: $ticket_path
- Suggested branch: $branch
- Report: $report

Next actions:
1) Update ticket debate/evidence sections.
2) Run project tests relevant to the claim/fix.
3) Record commands + outputs in ticket and report.
4) Commit using prefix: audit: (codex) or fix: (claude).
MSG
