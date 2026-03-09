---
id: PG-059
title: Credential redaction does not recurse into arrays — passwords leak in array-structured configs
severity: high
status: fixed
files: [src/server/routes/data-sources.ts]
created_by: independent-auditor
updated_by: independent-auditor
---

## Summary

`redactObject()` skips arrays entirely. A data source config with credentials nested inside arrays (e.g., `{"endpoints": [{"host": "db1", "password": "secret"}]}`) returns passwords unredacted in API responses.

## Evidence

- `src/server/routes/data-sources.ts:55-67` — `!Array.isArray(value)` check causes arrays to pass through unredacted
- Exploit: store config `{"endpoints": [{"host": "db1.prod", "password": "P@ssw0rd"}]}` — password returned in GET response

## Why this matters

Direct credential leakage. Any config using array structures exposes all nested sensitive values.

## Proposed fix

Add array recursion: when value is an array, map over elements and recurse into objects within the array.

## Acceptance checks

- [ ] Array-nested credentials are redacted
- [ ] Test covers array-structured config redaction

## Debate

### Gatekeeper claim

Direct credential leakage path.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
