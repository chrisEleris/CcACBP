---
id: PG-072
title: ECS_PARAM_REGEX allows whitespace including newlines — enables log injection via cluster/service names
severity: low
status: open
files: [src/server/routes/ecs.ts]
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`ECS_PARAM_REGEX` in `ecs.ts` is defined as `/^[a-zA-Z0-9\-_/.:\s]*$/`. The `\s` character class matches any whitespace including `\t` (tab), `\n` (newline), `\r` (carriage return). A path parameter containing a newline passes validation, and the validated cluster name is then echoed in:

1. `console.error()` log messages — log injection
2. HTTP response body fields (`data.cluster`, `data.service`, `data.taskId`, error message templates) — response injection

This means an attacker with a valid API key could craft a cluster name like `real-cluster\nERROR: [fake injected line]` and inject lines into the application's log output.

## Evidence

`src/server/routes/ecs.ts` lines 30–31:

```typescript
const ECS_PARAM_REGEX = /^[a-zA-Z0-9\-_/.:\s]*$/;
```

Verified:

```javascript
const ECS_PARAM_REGEX = /^[a-zA-Z0-9\-_/.:\s]*$/;
ECS_PARAM_REGEX.test('legit-cluster\nERROR: fake-injected-log-message'); // true
ECS_PARAM_REGEX.test('my\tcluster'); // true
```

Cluster names that pass validation are echoed in log messages:

```typescript
// Line 212
console.error("ECS DescribeClusters error:", err);

// Line 60 — used in response body
return `Cluster '${cluster}' is not in the list of allowed clusters`;

// Line 192 — echoed in response body
return c.json({ data: null, error: `Cluster not found: ${name}` }, 404);
```

AWS ECS cluster names are defined by AWS as alphanumeric characters, hyphens, and underscores only. Spaces and other whitespace are not valid ECS identifiers.

## Why this matters

Log injection can be used to:
1. Forge audit trail entries (e.g., make it appear an operation succeeded or a different user performed an action)
2. Obscure real errors in log analysis
3. If logs are ingested into a structured logging system (e.g., Loki, CloudWatch Logs Insights), inject syntactically valid log lines

This only requires an authenticated caller — in dev mode with no API_KEY, it requires no credentials at all.

## Proposed fix

Replace `\s` with explicit allowed characters matching real AWS ECS naming rules:

```typescript
// AWS ECS names: alphanumeric, hyphens, underscores. ARNs add colons, slashes, dots.
const ECS_PARAM_REGEX = /^[a-zA-Z0-9\-_/.:]+$/;
```

Remove `\s` entirely. No legitimate AWS ECS cluster name, service name, task ID, or ARN contains whitespace.

## Acceptance checks

- [ ] `ECS_PARAM_REGEX` no longer matches whitespace characters (`\s` removed or explicitly excluded)
- [ ] A test confirms that a cluster name containing `\n` or `\t` is rejected with 400
- [ ] Existing valid cluster name and ARN test cases continue to pass

## Debate

*(empty — no author response yet)*

## Final resolution

*(pending)*
