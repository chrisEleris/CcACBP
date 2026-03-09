---
id: PG-081
title: splitStatements does not handle inline comments — semicolon inside -- comment causes false-positive rejection
severity: low
status: open
files: [src/server/routes/query.ts, tests/server/query.test.ts]
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

The `splitStatements()` function added by the PG-070 fix is string-literal-aware but not comment-aware. In SQL, a `--` inline comment extends to the end of the line. Any `;` that appears inside a `--` comment is not a statement terminator. However, `splitStatements` does not track `--` comment context, so it will split on a `;` inside a comment. If the text after the split happens to start with a blocked keyword, a valid SELECT query is incorrectly rejected with HTTP 400.

## Evidence

Verified with Node.js simulation against the exact `splitStatements` code from `src/server/routes/query.ts`:

Input:
```
SELECT name FROM users -- only active users; DROP TABLE users
```

Expected behavior: This is one statement (`SELECT name FROM users`), rest is a comment. `isWriteStatement` should return `false`.

Actual behavior: `splitStatements` produces two entries:
- `"SELECT name FROM users -- only active users"` — not a write statement
- `"DROP TABLE users"` — matches `WRITE_STATEMENT_PATTERN`

Result: `isWriteStatement` returns `true`, and the query is rejected with 400.

Another example:
```sql
SELECT 1 -- step 1: SELECT only; DROP TABLE is explicitly excluded
```

Split produces `["SELECT 1 -- step 1: SELECT only", "DROP TABLE is explicitly excluded"]`. The second part starts with `DROP`, triggering rejection.

This is confirmed to be a PRE-EXISTING limitation — the original `.split(";")` had the same behavior. The PG-070 fix targeted string-literal semicolons only and correctly documented that scope. The comment case was never addressed by any fix or ticket.

## Why this matters

1. **False positives for inline-annotated SQL**: Users who write SQL with inline comments that happen to contain semicolons followed by write-like text will have legitimate read queries rejected. This is an uncommon but legitimate SQL authoring pattern.

2. **Documentation gap**: The code comment at line 30–37 (`query.ts`) describes what the function handles ("single-quotes, double-quotes, backticks", "doubled quotes") but does not mention the comment-awareness limitation. A future implementer could misread the function as fully correct.

3. **Scope of PG-070 fix**: PG-070's acceptance criteria were met (string literals are correctly handled). This is a distinct, remaining limitation that warrants its own tracking.

Severity is low (not medium) because:
- Semicolons inside `--` comments followed by write keywords is a rarely-seen pattern in practice
- The execution layer (SQLite) would treat the real query correctly even if the check passed it through, since the comment absorbs everything after `--` in a real SQL parser
- No real write operation can be executed via this path — it only causes false positives (over-rejection), not false negatives (under-rejection)

## Proposed fix

Extend `splitStatements` to track `--` inline comment context:

```typescript
export function splitStatements(sqlStr: string): string[] {
  const stmts: string[] = [];
  let current = "";
  let inString = false;
  let stringChar = "";
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sqlStr.length; i++) {
    const ch = sqlStr[i];

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
      }
      current += ch;
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && sqlStr[i + 1] === "/") {
        current += ch + sqlStr[++i];
        inBlockComment = false;
      } else {
        current += ch;
      }
      continue;
    }

    if (!inString) {
      if (ch === "-" && sqlStr[i + 1] === "-") {
        inLineComment = true;
        current += ch;
        continue;
      }
      if (ch === "/" && sqlStr[i + 1] === "*") {
        inBlockComment = true;
        current += ch;
        continue;
      }
    }

    if (inString) {
      current += ch;
      if (ch === stringChar) {
        if (sqlStr[i + 1] === stringChar) {
          current += sqlStr[++i];
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

Alternatively, document the limitation in a code comment and add a test that explicitly asserts the known false-positive (with a `TODO: fix comment awareness` note).

## Acceptance checks

- [ ] `isWriteStatement("SELECT 1 -- comment with ; DROP TABLE users")` returns `false`
- [ ] `isWriteStatement("SELECT 1 -- comment\nDROP TABLE users")` returns `true` (real second statement)
- [ ] All existing `splitStatements` and `isWriteStatement` tests continue to pass
- [ ] OR: a test documents the known false-positive behavior with an explanatory comment

## Debate

*(empty — no author response yet)*

## Final resolution

*(pending)*
