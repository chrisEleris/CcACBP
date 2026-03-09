---
id: PG-019
title: IAM users API returns hardcoded empty groups, mfaEnabled=false, accessKeys=0 regardless of reality
severity: low
status: open
files:
  - src/server/routes/aws.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`GET /api/aws/iam/users` returns `IAMUser` objects where `groups: []`, `mfaEnabled: false`, and `accessKeys: 0` are hardcoded regardless of the actual IAM state. The AWS `ListUsersCommand` only returns basic user metadata — additional API calls are needed to fetch groups, MFA devices, and access key counts. The route silently returns incorrect security-relevant data without indicating it is incomplete.

## Evidence

- `src/server/routes/aws.ts:133-141`:
  ```ts
  const users: IAMUser[] = (response.Users ?? []).map((user) => ({
    ...
    groups: [],          // hardcoded
    mfaEnabled: false,   // hardcoded
    accessKeys: 0,       // hardcoded
  }));
  ```
- The IAM page UI likely shows MFA as "disabled" and groups as empty for all users, which is factually incorrect and could lead operators to believe all users have MFA disabled when they do not.
- Compare to EC2 (`cpu: 0, memory: 0` is also hardcoded but less security-relevant).

## Why this matters

The IAM page is a security monitoring view. Displaying `mfaEnabled: false` for all users regardless of their actual MFA status means operators using this dashboard to audit MFA compliance will see incorrect data. The AI quick action "Check MFA compliance across all IAM users" references this data. False security metrics are more dangerous than absent ones.

## Proposed fix

1. Add `ListMFADevicesCommand` per user to get actual MFA status, or use `GetAccountAuthorizationDetails` for batch retrieval.
2. If additional API calls are not viable in the stub phase, add a `_incomplete: true` flag to the response or document the limitation clearly in the response metadata.
3. Alternatively, add a comment in the IAM page UI noting "MFA status not available in this view" until the API returns real data.

## Acceptance checks

- [ ] Either real MFA/groups/accessKeys data is fetched and returned, OR the response includes a clear `incomplete: true` flag at the top level with a description of what is missing.
- [ ] The IAM page UI does not display "MFA: Disabled" as if it is a verified fact when the data is not fetched.

## Debate

### Gatekeeper claim

Returning `mfaEnabled: false` for all IAM users regardless of reality is a silent data falsification in a security-relevant view. Operators relying on this dashboard for MFA compliance auditing will get wrong answers.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
