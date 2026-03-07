# PG-008: Cron expression validation allows semantically invalid range values

**Severity:** low
**Status:** fixed
**Created:** 2026-03-07
**Reviewed head:** c6f6f628ce56aaa77d54b08f44df49a9db316256
**Fixed head:** e209175cbd0517f429254adc07dd6e8e7459350e

---

## Summary

The cron expression validator in `src/server/routes/scheduled-reports.ts` uses a regex that validates the structural format of each field (`CRON_FIELD`) but does not enforce field-specific value ranges (minute 0-59, hour 0-23, etc.) or that range start is less than end. Values like `"99 99 99 99 99"` or `"59-0 * * * *"` pass validation and are stored in the database.

---

## Evidence

`src/server/routes/scheduled-reports.ts` lines 15-26:
```typescript
const CRON_FIELD = /^(\*|[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*)(\/[0-9]+)?$/;
const cronExpression = z
  .string()
  .min(1)
  .refine((val) => {
    const parts = val.trim().split(/\s+/);
    if (parts.length < 5 || parts.length > 6) return false;
    return parts.every((part) => CRON_FIELD.test(part));
  }, { message: "Invalid cron expression..." });
```

`"99 99 99 99 99"` passes: each field matches `[0-9]+`, which is valid per the regex.

`"59-0 * * * *"` passes: `59-0` matches `[0-9]+(-[0-9]+)?`.

---

## Why this matters

1. **Invalid schedules stored**: Clients that store `"99 99 * * *"` will never fire, silently appearing "scheduled" forever.
2. **Inconsistent behavior**: Different cron implementations (AWS EventBridge, node-cron) react differently to out-of-range values — some fail silently, some throw.

---

## Proposed fix

Add per-field range validation:
```typescript
function validateCronField(field: string, min: number, max: number): boolean {
  // Normalize: expand ranges and lists, then check each number
  ...
}
```

Or use a well-tested cron validation library (e.g. `cron-parser`) which handles semantic validation.

---

## Acceptance checks

- [x] `"99 99 99 99 99"` is rejected with a clear error message
- [x] `"59-0 * * * *"` is rejected (descending range) or explicitly accepted if the cron library supports it

---

## Debate

*(empty — awaiting author response if disputed)*

---

## Final resolution

`src/server/routes/scheduled-reports.ts` now adds `CRON_RANGES` (per-field min/max bounds) and `validateCronFieldRange()` which checks each comma-separated value and range bound against the allowed range for that field position. The `cronExpression` refine callback runs both `CRON_FIELD.test(part)` and `validateCronFieldRange(part, CRON_RANGES[i])`. Values like `"99 99 99 99 99"` and `"59-0 * * * *"` are now rejected.
