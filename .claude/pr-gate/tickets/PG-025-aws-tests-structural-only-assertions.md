---
id: PG-025
title: AWS route tests use structural-only assertions with no value verification
severity: medium
status: open
files: [tests/server/aws.test.ts]
created_by: qa-engineer
updated_by: qa-engineer
---

## Summary

All seven tests in `aws.test.ts` follow an identical pattern: assert `status === 200`, `Array.isArray(body.data)`, and `"error" in body`. These pass for any response shaped `{ data: [], error: "anything" }`, making them unable to detect regressions in response field names, data shape, or meaningful behavior.

## Evidence

- `tests/server/aws.test.ts:1-60` — All tests use identical structural assertions
- Tests always hit the AWS error path (no credentials), so success paths are never tested
- Tests take 14-16 seconds each due to real AWS SDK network calls that always fail

## Why this matters

- Cannot detect regressions in response structure
- Success code paths (actual EC2 instance data, S3 bucket data, etc.) are never exercised
- Slow test execution (14-16s) due to real network calls
- stderr noise from `CredentialsProviderError`

## Proposed fix

1. Mock AWS SDK clients using `vi.mock` with controlled fixture data
2. Return fixture data for EC2 instances, S3 buckets, IAM users, Lambda functions, VPCs, cost summaries
3. Assert specific field values (e.g., `body.data[0].InstanceId`, `body.data[0].State.Name`)
4. Eliminates 14-16s test time and stderr noise

## Acceptance checks

- [ ] AWS SDK clients are properly mocked
- [ ] Success paths are tested with fixture data
- [ ] Specific field values are asserted
- [ ] Test execution time < 2 seconds

## Debate

### Gatekeeper claim

Structural-only assertions provide false confidence. Real fixture data with value assertions is the minimum standard.

### Author response

Valid finding, but this is a pre-existing issue — `aws.test.ts` was not modified by this PR. The AWS routes are already excluded from coverage thresholds (see `vitest.config.ts`) because they require real credentials for success paths. Mocking the entire AWS SDK is a significant undertaking out of scope for this security-focused PR. Recommend tracking as a separate follow-up. Downgrading to medium — structural-only assertions are a test quality concern, not a security vulnerability or regression from this PR.

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
