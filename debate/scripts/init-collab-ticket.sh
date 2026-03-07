#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <YYYYMMDD> <short-slug> [priority:P1]" >&2
  exit 2
fi

date_part="$1"
slug="$2"
priority="${3:-P1}"
ticket_id="TKT-${date_part}-${slug}"
ticket_path="debate/tickets/${ticket_id}.md"

if [[ ! "$priority" =~ ^P[0-3]$ ]]; then
  echo "Invalid priority: $priority (expected P0..P3)" >&2
  exit 2
fi

if [[ -f "$ticket_path" ]]; then
  echo "Ticket already exists: $ticket_path" >&2
  exit 1
fi

cp debate/tickets/TEMPLATE.md "$ticket_path"
python - "$ticket_path" "$ticket_id" "$priority" <<'PY'
import sys
from pathlib import Path
path=Path(sys.argv[1])
ticket_id=sys.argv[2]
priority=sys.argv[3]
text=path.read_text()
lines=text.splitlines()
lines[0]=f"# {ticket_id}"
text='\n'.join(lines)+"\n"
text=text.replace('`P0 | P1 | P2 | P3`', f'`{priority}`', 1)
path.write_text(text)
PY

cat <<MSG
Created ticket: $ticket_path
Recommended branches:
  codex/audit/${ticket_id}
  claude/fix/${ticket_id}
Recommended reports:
  debate/reports/codex/${ticket_id}-audit.md
  debate/reports/claude/${ticket_id}-fix.md
MSG
