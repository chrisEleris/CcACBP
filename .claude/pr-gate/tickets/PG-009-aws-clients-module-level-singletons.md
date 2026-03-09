---
id: PG-009
title: AWS clients initialized as module-level singletons without credentials validation
severity: medium
status: fixed
files:
  - src/server/services/aws-clients.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

All AWS SDK clients (`ec2Client`, `ecsClient`, `s3Client`, `cwClient`, `iamClient`, `lambdaClient`, `costClient`) are created as module-level singletons using only the configured region. No AWS credentials are validated at startup. If the application starts in an environment with no AWS credentials at all, the clients are created successfully and every API call fails at request time with an AWS `CredentialsProviderError`, producing a generic error in the route handler. There is no startup check or clear diagnostic that the AWS integration is not configured.

## Evidence

- `src/server/services/aws-clients.ts:12-18` — all clients created with `{ region }` only, no credentials parameter, relying entirely on the SDK's default credential chain.
- `src/server/routes/aws.ts:74-78` — error handling only converts `Error.message` to a string; `CredentialsProviderError` from AWS SDK produces a message that is not user-friendly ("Could not load credentials from any providers").
- No health check endpoint validates that AWS credentials are available before accepting traffic.
- `src/server/routes/health.ts` — the `/health/db` endpoint tests DB connectivity but there is no `/health/aws` endpoint.

## Why this matters

Operators who deploy the app without AWS credentials see cryptic SDK errors on every AWS page. More critically, there is no way to differentiate between "wrong credentials" and "API network failure" vs. "this feature is intentionally not connected". A health check or startup validation would surface misconfiguration immediately.

## Proposed fix

1. Add a `/api/health/aws` endpoint that calls a cheap, read-only AWS API (e.g., `DescribeRegions` on EC2 or `GetCallerIdentity` on STS) and returns the identity or a clear "not configured" message.
2. Log a warning at startup if the credential chain is unavailable (try a cheap STS call and log a warning, do not fail hard).
3. Improve error messages in AWS route handlers to distinguish "credentials not configured" from "API call failed" for the UI.

## Acceptance checks

- [ ] `GET /api/health/aws` returns a meaningful status (200 with identity or 503 with "not configured").
- [ ] AWS route errors distinguish "credentials unavailable" from other error types.
- [ ] Existing AWS route tests still pass.

## Debate

### Gatekeeper claim

Module-level client singletons with no credential validation produce poor diagnostics on startup and make it impossible to distinguish misconfiguration from network failure. A health endpoint is a standard production readiness requirement.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
