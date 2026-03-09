---
id: PG-017
title: AiAgentType enum duplicated in four locations instead of using the shared type
severity: low
status: open
files:
  - src/shared/types.ts
  - src/server/routes/ai.ts
  - src/client/pages/AiAssistantPage.tsx
  - src/client/components/AiDrawer.tsx
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

The AI agent type values (`"log-analysis"`, `"cost-optimization"`, `"infrastructure"`, `"security"`, `"report-builder"`, `"general"`) are defined independently in four separate locations. Any addition of a new agent type requires changes in all four files.

## Evidence

- `src/shared/types.ts:437-444` — `AiAgentType` type defined.
- `src/server/routes/ai.ts:16-26` and `37-47` — agent type enum repeated in two Zod schemas within the same file.
- `src/client/pages/AiAssistantPage.tsx:8-15` — `AgentType` re-declared locally.
- `src/client/components/AiDrawer.tsx` — `QUICK_ACTIONS_BY_CONTEXT` uses the string values but has no type binding to `AiAgentType`.
- `src/server/routes/ai.ts:49-86` — `availableAgents` array repeats all 6 agent types as string literals.

## Why this matters

This is a maintainability concern. Adding a 7th agent type requires changes in at least 4 files. The `AgentType` in `AiAssistantPage.tsx` is a local type that does not reference `AiAgentType` from shared types — a developer could add to one without updating the others. The Zod schemas in `routes/ai.ts` should derive from the shared type.

## Proposed fix

1. Define the agent type values as a `const` array in `src/shared/types.ts`:
   ```ts
   export const AI_AGENT_TYPES = ["log-analysis","cost-optimization","infrastructure","security","report-builder","general"] as const;
   export type AiAgentType = (typeof AI_AGENT_TYPES)[number];
   ```
2. Use `z.enum(AI_AGENT_TYPES)` in the Zod schemas in `routes/ai.ts`.
3. Import `AiAgentType` in `AiAssistantPage.tsx` instead of redeclaring.

## Acceptance checks

- [ ] Adding a new agent type requires a change in only `src/shared/types.ts` (plus route config).
- [ ] All existing tests pass after refactoring.
- [ ] TypeScript compilation succeeds.

## Debate

### Gatekeeper claim

The enum is repeated in 4 locations. The shared types file already defines `AiAgentType` but is not used in the route Zod schemas or client components.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
