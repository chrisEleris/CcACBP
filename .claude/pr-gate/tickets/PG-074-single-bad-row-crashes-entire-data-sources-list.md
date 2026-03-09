---
id: PG-074
title: One corrupted or undecryptable data source row causes GET /api/data-sources to return 500 for all rows
severity: low
status: open
files: [src/server/routes/data-sources.ts]
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`redactDataSource()` calls `decryptConfig()` which throws if the stored value begins with `enc:v1:` but `SECRET_KEY` is unset or if the GCM auth tag fails (corrupted data or key rotation). This exception propagates through `all.map(redactDataSource)` causing the entire map to fail. The outer `catch` block on the list endpoint then returns a 500 for the full list, even though all other rows may be perfectly valid. A single corrupted or mis-keyed row renders the entire data sources list inaccessible.

## Evidence

`src/server/routes/data-sources.ts` lines 94–98:

```typescript
function redactDataSource(row: DataSourceRow): DataSourceRow {
  // Decrypt first, then redact sensitive fields before returning to the caller.
  const decrypted = decryptConfig(row.config);   // throws if auth fails or key missing
  return { ...row, config: redactConfig(decrypted) };
}
```

Lines 147–153 (list endpoint):

```typescript
return c.json({
  data: all.map(redactDataSource),   // map throws if any row fails decrypt
  pagination: { limit: pagination.limit, offset: pagination.offset, total },
});
...
} catch (error) {
  console.error("Error listing data sources:", error);
  return c.json({ message: "Failed to list data sources" }, 500);  // entire list returns 500
}
```

`decryptConfig` throws in two documented scenarios (lines 30–35):

```typescript
function decryptConfig(storedValue: string): string {
  if (!storedValue.startsWith(ENCRYPTED_PREFIX)) return storedValue;
  if (!config.SECRET_KEY) {
    throw new Error("SECRET_KEY is required to decrypt stored credentials");
  }
  return decrypt(storedValue.slice(ENCRYPTED_PREFIX.length), config.SECRET_KEY);
  // ^^^ also throws if GCM authentication fails (data corruption, key rotation)
}
```

## Why this matters

**Key rotation scenario**: When the operator changes `SECRET_KEY`, all previously encrypted rows become undecryptable. The list endpoint returns 500 and the UI shows no data sources at all, with no indication of the root cause.

**Data corruption scenario**: A partial write or disk error corrupting one row's config column causes the entire list to become inaccessible.

**Blast radius**: A single bad row degrades availability for all users and all data sources, not just the affected row.

## Proposed fix

Catch per-row decryption errors and return a safe sentinel value instead of throwing:

```typescript
function redactDataSource(row: DataSourceRow): DataSourceRow {
  let decrypted: string;
  try {
    decrypted = decryptConfig(row.config);
  } catch (err) {
    console.error(`Failed to decrypt config for data source ${row.id}:`, err);
    // Return a placeholder that clearly signals the row is inaccessible.
    decrypted = JSON.stringify({ error: "config_decryption_failed" });
  }
  return { ...row, config: redactConfig(decrypted) };
}
```

This isolates the failure to the affected row and keeps the rest of the list functional. Operators can identify the bad row via the `error` sentinel field.

## Acceptance checks

- [ ] A test verifies that if one row's config is set to a corrupted `enc:v1:INVALID_BASE64` value, `GET /api/data-sources` still returns 200 with all other rows intact
- [ ] The corrupted row is present in the response with a recognizable sentinel (e.g., `{"error":"config_decryption_failed"}`) rather than crashing the list
- [ ] The error is logged server-side with the affected row's ID for operator investigation

## Debate

*(empty — no author response yet)*

## Final resolution

*(pending)*
