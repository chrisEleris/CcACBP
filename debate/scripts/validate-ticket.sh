#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <ticket-file> [ticket-file ...]" >&2
  exit 2
fi

required_sections=(
  "## Header"
  "## 1) Claim"
  "## 2) Impact"
  "## 3) Reproduction / Detection"
  "## 4) Acceptance Criteria"
  "## 6) Evidence Log"
  "## 7) Debate Log"
  "## 9) Decision"
  "## 12) Closure Checklist"
)

required_header_fields=(
  "- Status:"
  "- Priority:"
  "- Owner:"
  "- Created:"
  "- Last Updated:"
  "- SLA Due:"
)

fail=0

for ticket in "$@"; do
  if [[ ! -f "$ticket" ]]; then
    echo "[FAIL] Missing file: $ticket"
    fail=1
    continue
  fi

  echo "Checking $ticket"

  for section in "${required_sections[@]}"; do
    if ! rg -n --fixed-strings -- "$section" "$ticket" >/dev/null; then
      echo "  [FAIL] Missing section: $section"
      fail=1
    fi
  done

  for field in "${required_header_fields[@]}"; do
    if ! rg -n --fixed-strings -- "$field" "$ticket" >/dev/null; then
      echo "  [FAIL] Missing header field: $field"
      fail=1
    fi
  done

  if ! rg -n --fixed-strings -- 'Result: `FAIL`' "$ticket" >/dev/null; then
    echo "  [FAIL] Missing before-fix failing evidence marker"
    fail=1
  fi

  if ! rg -n --fixed-strings -- 'Result: `PASS`' "$ticket" >/dev/null; then
    echo "  [FAIL] Missing after-fix passing evidence marker"
    fail=1
  fi
done

if [[ $fail -ne 0 ]]; then
  echo "Ticket validation failed."
  exit 1
fi

echo "All ticket checks passed."
