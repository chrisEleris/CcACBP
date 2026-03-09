import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "../../src/server/lib/crypto";

const TEST_SECRET = "test-secret-key-for-vitest-32bytes";

describe("crypto — encrypt/decrypt (PG-054)", () => {
  it("round-trips plaintext correctly", () => {
    const plaintext = "hello world";
    const ciphertext = encrypt(plaintext, TEST_SECRET);
    expect(decrypt(ciphertext, TEST_SECRET)).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    const ciphertext = encrypt("", TEST_SECRET);
    expect(decrypt(ciphertext, TEST_SECRET)).toBe("");
  });

  it("round-trips a long unicode string", () => {
    const plaintext = "password123!@#$%^&*() — with unicode: \u00e9\u00e0\u00fc";
    const ciphertext = encrypt(plaintext, TEST_SECRET);
    expect(decrypt(ciphertext, TEST_SECRET)).toBe(plaintext);
  });

  it("produces different ciphertext on each call (random IV)", () => {
    const plaintext = "same input";
    const first = encrypt(plaintext, TEST_SECRET);
    const second = encrypt(plaintext, TEST_SECRET);
    // Base64 output must differ because the IV is random each time.
    expect(first).not.toBe(second);
    // Both must still decrypt correctly.
    expect(decrypt(first, TEST_SECRET)).toBe(plaintext);
    expect(decrypt(second, TEST_SECRET)).toBe(plaintext);
  });

  it("throws when decrypted with the wrong key", () => {
    const ciphertext = encrypt("secret data", TEST_SECRET);
    expect(() => decrypt(ciphertext, "wrong-key-that-is-also-32-chars!")).toThrow();
  });

  it("throws 'too short' error for truncated ciphertext", () => {
    // A valid base64 string that is shorter than IV_LENGTH (12) + TAG_LENGTH (16) = 28 bytes.
    const tooShort = Buffer.alloc(10).toString("base64");
    expect(() => decrypt(tooShort, TEST_SECRET)).toThrow("too short");
  });

  it("throws for completely invalid base64 / garbage input", () => {
    // A string that decodes to enough bytes but has a broken auth tag.
    const garbage = Buffer.alloc(50, 0xff).toString("base64");
    expect(() => decrypt(garbage, TEST_SECRET)).toThrow();
  });

  it("encrypt output is a non-empty base64 string", () => {
    const result = encrypt("data", TEST_SECRET);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    // Valid base64 contains only [A-Za-z0-9+/=]
    expect(/^[A-Za-z0-9+/]+=*$/.test(result)).toBe(true);
  });

  it("multiple encrypt/decrypt calls with the same key all round-trip correctly (PG-071 cache)", () => {
    const inputs = Array.from({ length: 10 }, (_, i) => `plaintext-value-${i}`);
    const ciphertexts = inputs.map((p) => encrypt(p, TEST_SECRET));
    const decrypted = ciphertexts.map((c) => decrypt(c, TEST_SECRET));
    expect(decrypted).toEqual(inputs);
  });
});
