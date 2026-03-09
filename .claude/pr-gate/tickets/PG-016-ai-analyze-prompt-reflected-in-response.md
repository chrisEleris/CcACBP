---
id: PG-016
title: AI analyze endpoint reflects user prompt directly into response string
severity: low
status: open
files:
  - src/server/routes/ai.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

The `POST /api/ai/analyze` mock handler reflects the first 100 characters of the user-supplied `prompt` directly into the response string without any escaping or sanitization. While currently this is a mock (not a real AI call), the pattern sets up a template for the production implementation that could lead to prompt injection issues if the same approach is used when a real LLM is wired in.

## Evidence

- `src/server/routes/ai.ts:227-230`:
  ```ts
  response: `Based on the ${pageContext} data for your query "${prompt.slice(0, 100)}": This is a mock analysis response...`
  ```
- The user-supplied `prompt` is sliced to 100 chars and embedded directly in the returned string.
- The test at `tests/server/ai.test.ts:623-634` explicitly validates this reflection behavior, testing that the first 100 chars of a 200-char prompt appear in the response — cementing the pattern.

## Why this matters

When the stub is replaced with a real LLM call, reflecting the user prompt into the response body is the correct behavior (echoing the question asked). However, the current pattern makes no distinction between the prompt as data and the response as output, and does not sanitize the prompt before embedding it. If the response is rendered as HTML (even inside a React component using `dangerouslySetInnerHTML` — which does not currently occur), prompt content with HTML/script injection could cause XSS.

Currently, the React client renders the response with `{msg.content}` (safe), but this pattern should be documented as a conscious choice.

## Proposed fix

This is a low-severity pre-emptive issue. The immediate fix is documentation: add a comment in the analyze route noting that when a real LLM is wired in, user prompt content must not be reflected verbatim into structured response fields that might be processed further (e.g., as code, as SQL, or as HTML). Ensure the client always renders AI responses as plain text, never as HTML.

## Acceptance checks

- [ ] The client renders AI response content as plain text (currently correct: `{msg.content}`).
- [ ] A comment in the analyze route handler notes the injection risk when implementing the real LLM call.

## Debate

### Gatekeeper claim

The reflection is safe in the current mock context and the client renders it as plain text. This is a pre-emptive risk note for when the stub is replaced.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.
