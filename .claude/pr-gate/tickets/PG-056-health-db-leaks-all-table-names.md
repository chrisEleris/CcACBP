---
id: PG-056
title: GET /health/db returns all internal table names despite PG-005 fixing query/schema
severity: low
status: fixed
files:
  - src/server/routes/health.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

PG-005 fixed `GET /api/query/schema` to only expose allow-listed user-facing tables. However, `GET /health/db` still queries `sqlite_master` and returns all table names, including internal operational tables like `ai_conversations`, `ai_messages`, `report_executions`, `dashboard_widgets`, `report_templates`, and `scheduled_reports`.

## Evidence

`src/server/routes/health.ts:11-22`:
```ts
.get("/health/db", async (c) => {
  const result = await db.all<{ name: string }>(
    sql`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
  );
  const tables = result
    .filter((row): row is { name: string } => typeof row.name === "string")
    .map((row) => row.name);
  return c.json({ status: "ok", tables });
})
```

The response includes every table in the database. While `GET /health/db` is protected by `apiKeyAuth` (the same as all `/api/*` routes), it reveals the complete internal schema to any API caller. PG-005 fixed the query/schema disclosure by implementing an explicit allow-list (`SCHEMA_ALLOWED_TABLES`), but the same principle was not applied to the health endpoint.

## Why this matters

While this is lower severity than PG-005 (the health endpoint is authenticated), it is inconsistent with the stated fix. An operator reviewing PG-005's status as "fixed" would expect the full schema is no longer externally visible, but `GET /health/db` provides an equivalent disclosure to any authenticated caller.

For a production deployment, the health endpoint's purpose is connectivity verification (`status: ok`), not schema enumeration. The table list serves no operational monitoring purpose.

## Proposed fix

Remove the `tables` field from the `GET /health/db` response, or replace it with a count:

```ts
return c.json({ status: "ok", tableCount: tables.length });
```

If table names are needed for internal debugging, they should not be included in the external API response.

## Acceptance checks

- [ ] `GET /health/db` response does not contain internal table names (`ai_conversations`, `report_executions`, etc.).
- [ ] The endpoint still returns `status: "ok"` on successful DB access and `status: "error"` on failure.

## Debate

_Not yet provided._

## Final resolution

Pending.
