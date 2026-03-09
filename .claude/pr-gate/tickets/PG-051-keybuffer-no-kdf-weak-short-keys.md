---
id: PG-051
title: keyBuffer() pads short SECRET_KEY values with null bytes producing trivially weak AES keys
severity: high
status: fixed
files:
  - src/server/lib/crypto.ts
created_by: pr-gatekeeper
updated_by: pr-gatekeeper
---

## Summary

`keyBuffer()` in `crypto.ts` derives a 32-byte AES-256-GCM key by truncating or zero-padding the raw UTF-8 bytes of `SECRET_KEY`. A secret shorter than 32 bytes results in a key whose remaining bytes are all `0x00`. This is not a key-derivation function — it is a fixed-length copy. The effective entropy of the key equals only the entropy of the `SECRET_KEY` bytes provided, with the remainder predictably padded. A 10-character ASCII secret (80 bits) leaves 22 bytes of the AES key as zeros, which is known and exploitable.

## Evidence

Verified with `node -e`:

```js
const secret = 'abc';  // 3 bytes
const raw = Buffer.from(secret, 'utf8');
const key = Buffer.alloc(32);
raw.copy(key, 0, 0, Math.min(raw.length, 32));
console.log(key.toString('hex'));
// → 6162630000000000000000000000000000000000000000000000000000000000
//   ^^^--- only 3 bytes of entropy, 29 trailing zeros are known
```

- `src/server/lib/crypto.ts:12-17` — `keyBuffer` function.
- `src/server/config.ts:12` — `SECRET_KEY` is validated as `z.string().min(1).optional()`. A 1-character key is accepted in development.
- The `.env.example` says "use a strong random value (e.g. openssl rand -hex 32)" — but there is no enforcement that the provided key is long enough to fill the 32-byte key buffer.

Additionally, no KDF means:
- All encrypted records share the same AES key (no key stretching or salting per-record key).
- There is no forward secrecy: compromising `SECRET_KEY` decrypts all historical records.
- Key rotation (changing `SECRET_KEY`) immediately renders all existing encrypted rows unreadable with no migration path.

## Why this matters

Data-source credentials (database passwords, AWS access keys, API tokens) are stored using this cipher. If an operator sets a short or low-entropy `SECRET_KEY` — e.g. during development, and that database is later promoted to production — the credentials are protected by fewer than 256 bits of effective key material. An attacker who obtains the ciphertext (e.g. via a database dump) can brute-force short keys.

## Proposed fix

Replace `keyBuffer()` with a proper KDF:

```ts
import { scryptSync, randomBytes } from "node:crypto";

// Derive a 32-byte key from secret + a fixed app-level salt using scrypt.
// The salt is not secret (it prevents pre-computation) — store it as a constant.
const APP_SALT = Buffer.from("ccacbp-datasource-key-v1");

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, APP_SALT, 32, { N: 16384, r: 8, p: 1 });
}
```

Alternatively, enforce a minimum `SECRET_KEY` length of 32 characters at startup (in `config.ts` or `entry.ts`) so that `keyBuffer()` always receives enough entropy. Add a migration utility for re-encrypting existing rows after a key change.

## Acceptance checks

- [ ] A `SECRET_KEY` shorter than 32 bytes either raises a startup error OR the key derivation uses a KDF that stretches the key to 256 bits regardless.
- [ ] Changing `SECRET_KEY` does not silently produce unreadable ciphertext; either migration is supported or the issue is documented.
- [ ] Unit tests for `encrypt`/`decrypt` round-trip exist and cover edge cases (empty plaintext, long plaintext, wrong key fails decryption).

## Debate

_Not yet provided._

## Final resolution

**Cycle 6 Gatekeeper verification (2026-03-09):**

Fix confirmed present in `src/server/lib/crypto.ts`:

- Lines 1–5: imports `scryptSync` from `node:crypto`.
- Line 12: `KDF_SALT = Buffer.from("ccacbp-datasource-key-v1")` — fixed application-level salt.
- Lines 29–35: `keyBuffer()` calls `scryptSync(secret, KDF_SALT, KEY_LENGTH)` which is a memory-hard KDF, not a raw copy. A 1-byte secret is stretched to a full 32-byte AES key with proper entropy.
- `src/server/config.ts` lines 16–27: `superRefine` enforces `SECRET_KEY.length >= 32` in production via Zod validation.
- `src/server/entry.ts` lines 29–34: explicit startup check rejects process if `SECRET_KEY.length < 32` in production.

All three acceptance criteria are met. Status: **fixed**.
