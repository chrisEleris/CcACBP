---
id: PG-070
title: isWriteStatement false-positive — semicolons inside string literals cause legitimate SELECT queries to be rejected
severity: medium
status: fixed
files: [src/server/routes/query.ts, tests/server/query.test.ts]
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`isWriteStatement` splits the SQL input on every `;` character without being aware of quoted string literals. When a valid `SELECT` query contains a semicolon inside a string value, and the text after that semicolon happens to start with a blocked keyword (`INSERT`, `DROP`, etc.), the query is incorrectly rejected with a 400. This is a correctness bug: legitimate read-only queries are falsely blocked.

## Evidence

`src/server/routes/query.ts` lines 39–42:

```typescript
const statements = sqlStr
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);
```

The `.split(";")` is a raw string split that does not distinguish between a semicolon in a SQL string literal and a statement terminator.

Concrete false-positive example (verified with Node.js):

```
SELECT * FROM users WHERE script = 'step1; INSERT INTO log VALUES(1)'
```

Split result:
- Part 0: `SELECT * FROM users WHERE script = 'step1`  — not a write statement
- Part 1: `INSERT INTO log VALUES(1)'`  — **matches `WRITE_STATEMENT_PATTERN`**, triggers rejection

Running the actual regex against Part 1 confirms it returns `true` because Part 1 starts with `INSERT`.

Additional false-positive that is not caught but causes silent truncation:

```
SELECT name FROM proc_table WHERE proc = 'BEGIN; SELECT 1; END'
```

This splits into three "statements", but none happen to match a write keyword so the query passes — however the string parsing is still wrong.

No test in `tests/server/query.test.ts` covers the false-positive scenario where a `SELECT` query is incorrectly rejected due to a semicolon in a string literal.

## Why this matters

When the SQL execution is connected to a real database backend (as intended per the stub comment on line 140), users querying tables that store SQL strings, log messages, script names, or any free-text with semicolons followed by write keywords will have their legitimate read queries silently blocked with a generic 400. This is a usability correctness issue.

For the current stub this is low-impact, but the defence-in-depth comment implies this check is a permanent gatekeeper. False positives undermine trust in the tool.

## Proposed fix

Option A (minimal): Document the limitation clearly in a comment and accept the constraint for the stub phase. Add a test that documents the known false-positive.

Option B (correct): Use a proper SQL tokenizer (e.g., check if the character is inside a quoted string before treating it as a statement separator). A simple state-machine approach:

```typescript
function splitStatements(sql: string): string[] {
  const stmts: string[] = [];
  let current = "";
  let inString = false;
  let stringChar = "";
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (inString) {
      current += ch;
      if (ch === stringChar) {
        // Handle escaped quote via doubling (SQL standard)
        if (sql[i + 1] === stringChar) {
          current += sql[++i];
        } else {
          inString = false;
        }
      }
    } else if (ch === "'" || ch === '"' || ch === "`") {
      inString = true;
      stringChar = ch;
      current += ch;
    } else if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed) stmts.push(trimmed);
      current = "";
    } else {
      current += ch;
    }
  }
  const trimmed = current.trim();
  if (trimmed) stmts.push(trimmed);
  return stmts;
}
```

## Acceptance checks

- [ ] A test is added showing a `SELECT` query with a semicolon in a string literal containing a write keyword is NOT rejected (or the limitation is explicitly documented with a test that asserts the known false-positive)
- [ ] If Option B is implemented: the tokenizer handles single-quoted strings, double-quoted identifiers, and escaped quotes via doubling
- [ ] All existing `isWriteStatement` tests continue to pass

## Debate

*(empty — no author response yet)*

## Final resolution

**Cycle 5 Gatekeeper verification (2026-03-09):**

The fix is correctly implemented and all three acceptance criteria are met:

1. Test at line 274 confirms a `SELECT` with `'foo; INSERT INTO t2 VALUES(1)'` in a string literal returns `false`. PASS.
2. Test at line 302 confirms double-quoted identifiers with embedded semicolons are not split. PASS.
3. Test at line 307 confirms doubled-quote escape sequences (`it''s`) are correctly handled inside strings. PASS.
4. All existing `isWriteStatement` tests continue to pass (449 total passing).

Ticket status confirmed: **fixed**.

Note: A pre-existing limitation remains — semicolons inside `--` inline comments are not handled by `splitStatements`, which could cause false-positive rejection when comment text contains write keywords after a semicolon. This is a distinct issue tracked as PG-081 (separate ticket, low severity).
