---
id: PG-038
title: Dashboard mixes live AWS API data with hardcoded fixture CPU metrics
severity: low
status: open
files: [src/client/pages/DashboardPage.tsx, src/client/lib/mock-data.ts]
created_by: principal-engineer
updated_by: principal-engineer
---

## Summary

Dashboard stat cards show live data from real AWS endpoints. The CPU utilization chart uses static fixture data from `mock-data.ts` with no indication that it's fabricated.

## Evidence

- `src/client/pages/DashboardPage.tsx:26` — Uses `cpuMetrics` from mock-data.ts
- Four stat cards fetch real AWS data
- No visual indicator distinguishing live vs. demo data

## Why this matters

- Users connected to real AWS see genuine numbers alongside fabricated CPU metrics
- No indication of which data is real vs. fake — misleading for operators

## Proposed fix

Fetch real CloudWatch CPU metrics or add a visible label: "Sample data — connect CloudWatch for live metrics."

## Acceptance checks

- [ ] CPU metrics either fetched from CloudWatch or clearly labeled as demo
- [ ] No ambiguity about data source for operators

## Debate

### Gatekeeper claim

Mixing real and fake data without indication is misleading in an operations dashboard.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
