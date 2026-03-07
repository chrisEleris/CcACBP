#!/usr/bin/env python3
from __future__ import annotations

import json
import pathlib
import re
import subprocess
import sys
from typing import Dict, List

PR_COMMAND_RE = re.compile(r"\bgh\s+pr\s+(create|ready)\b", re.IGNORECASE)
BLOCKING_STATUSES = {
    "open",
    "accepted",
    "in_progress",
    "needs_author_response",
    "contested",
}
BLOCKING_SEVERITIES = {"blocker", "high"}


def read_input() -> Dict:
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def find_repo_root(start: pathlib.Path) -> pathlib.Path:
    for candidate in [start, *start.parents]:
        if (candidate / ".git").exists() or (candidate / ".claude").exists():
            return candidate
    return start


def parse_frontmatter(path: pathlib.Path) -> Dict[str, str]:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore").replace("\r\n", "\n")
    except Exception:
        return {}

    if not text.startswith("---\n"):
        return {}

    try:
        _, rest = text.split("---\n", 1)
        frontmatter_text, _ = rest.split("\n---\n", 1)
    except ValueError:
        return {}

    data: Dict[str, str] = {}
    for raw_line in frontmatter_text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip().strip('"').strip("'")
    return data


def current_head(repo_root: pathlib.Path) -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_root,
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except Exception:
        return ""


def deny(reason: str) -> None:
    payload = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }
    json.dump(payload, sys.stdout)


def main() -> None:
    payload = read_input()
    command = str(((payload.get("tool_input") or {}).get("command")) or "").strip()

    # Only gate actual PR creation/readiness commands.
    if not PR_COMMAND_RE.search(command):
        return

    cwd = pathlib.Path(str(payload.get("cwd") or ".")).resolve()
    repo_root = find_repo_root(cwd)

    gate_dir = repo_root / ".claude" / "pr-gate"
    summary_path = gate_dir / "SUMMARY.md"
    tickets_dir = gate_dir / "tickets"

    if not summary_path.exists():
        deny(
            "PR gate blocked: no .claude/pr-gate/SUMMARY.md found. "
            "Run the pr-gatekeeper subagent before creating the PR."
        )
        return

    summary = parse_frontmatter(summary_path)
    reviewed_head = summary.get("reviewed_head", "")
    overall_status = summary.get("overall_status", "").lower()

    head = current_head(repo_root)
    if not head:
        deny("PR gate blocked: could not determine current git HEAD.")
        return

    if reviewed_head != head:
        deny(
            f"PR gate blocked: current HEAD {head[:12]} has not been reviewed. "
            "Re-run the pr-gatekeeper subagent for the latest commit."
        )
        return

    blocking_tickets: List[str] = []
    if tickets_dir.exists():
        for ticket_path in sorted(tickets_dir.glob("PG-*.md")):
            meta = parse_frontmatter(ticket_path)
            status = meta.get("status", "").lower()
            severity = meta.get("severity", "").lower()
            if status in BLOCKING_STATUSES and severity in BLOCKING_SEVERITIES:
                ticket_id = meta.get("id") or ticket_path.stem
                blocking_tickets.append(f"{ticket_id} ({severity}/{status})")

    if overall_status != "pass" or blocking_tickets:
        detail = ""
        if blocking_tickets:
            shown = ", ".join(blocking_tickets[:5])
            detail = f" Open blocking tickets: {shown}."
        deny(
            "PR gate blocked: review summary is not PASS or blocking tickets remain."
            + detail
        )
        return


if __name__ == "__main__":
    main()
