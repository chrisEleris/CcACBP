---
id: PG-014
title: Data source credentials stored in plaintext SQLite config column
severity: high
status: fixed
files:
  - src/server/db/schema.ts
  - src/server/routes/data-sources.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

The `data_sources` table stores connection configuration (including passwords, tokens, API keys) as a plaintext JSON string in the `config TEXT NOT NULL` column. The `redactConfig` function in `data-sources.ts` correctly redacts sensitive fields in API responses, but the underlying database column is never encrypted. Any attacker with read access to the SQLite database file (file system access, database backup, database health endpoint) obtains all stored credentials in plaintext.

## Evidence

- `src/server/db/schema.ts:10` — `config: text("config").notNull()` — no encryption, plaintext JSON.
- `src/server/routes/data-sources.ts:9-20` — `SENSITIVE_CONFIG_KEYS` lists credential keys that are redacted on read, confirming sensitive data is expected to be stored.
- `src/server/routes/data-sources.ts:44-51` — `redactConfig` redacts on API responses only; the stored DB value remains plaintext.
- `src/server/routes/health.ts:9-24` — the `/health/db` endpoint returns all table names from `sqlite_master`, leaking schema info.
- The `config` column can contain MySQL passwords, Redshift credentials, S3 access keys, or CloudWatch API tokens depending on the data source type.

## Why this matters

This is a classic secret storage failure. The `config` column is a high-value target: any path to the SQLite file (backup compromise, file system breach, accidental log dump) reveals all stored credentials. The `DATABASE_URL` in `.env.example` uses a file path, meaning the database is a local file that can be read by any process running as the same user.

## Proposed fix

Option A (recommended for SQLite): Encrypt the `config` JSON before storing it using a symmetric key derived from a separate `SECRET_KEY` env var. Add `SECRET_KEY` to the config schema (required in production). Decrypt on read before returning to route handlers.

Option B: Store only a hash/reference and keep secrets in a secrets manager (AWS Secrets Manager, HashiCorp Vault) keyed by data source ID.

Option C (minimum viable): Add a strong warning in the UI and docs that the `config` field should not contain high-value credentials, and document the unencrypted storage limitation.

## Acceptance checks

- [ ] The `config` column value in the database is not plaintext-readable when a credential key is stored.
- [ ] Decryption happens transparently before use in route handlers.
- [ ] `SECRET_KEY` is required in production (similar to the API_KEY fix in PG-002).
- [ ] Existing data source tests pass (with test encryption key set).

## Debate

### Gatekeeper claim

`SENSITIVE_CONFIG_KEYS` and `redactConfig` exist precisely because the code knows credentials are stored in this column. The redaction only protects the API response, not the database file. This is a concrete secret storage failure for any deployment using real data source credentials.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
