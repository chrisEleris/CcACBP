import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16; // 128-bit auth tag (GCM default)
const KEY_LENGTH = 32; // AES-256 requires a 32-byte key

/**
 * Fixed application-level salt for the KDF.
 * Changing this value will invalidate all previously encrypted values.
 */
const KDF_SALT = Buffer.from("ccacbp-datasource-key-v1");

/**
 * Derives a 32-byte AES key from the provided secret using scrypt.
 * scrypt is a memory-hard KDF that prevents brute-force attacks on weak keys.
 */
function keyBuffer(secret: string): Buffer {
  return scryptSync(secret, KDF_SALT, KEY_LENGTH);
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a random IV.
 * Returns a single base64 string in the format: base64(iv || authTag || ciphertext).
 *
 * @param plaintext - The value to encrypt.
 * @param secret   - The SECRET_KEY from config (must be non-empty).
 */
export function encrypt(plaintext: string, secret: string): string {
  const iv = randomBytes(IV_LENGTH);
  const key = keyBuffer(secret);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine iv + tag + ciphertext into one buffer for easy storage.
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypts a value produced by {@link encrypt}.
 * Returns the original plaintext string.
 *
 * @param encoded  - The base64-encoded iv||tag||ciphertext string.
 * @param secret   - The SECRET_KEY from config (must match the key used during encryption).
 * @throws If authentication fails or the encoded value is malformed.
 */
export function decrypt(encoded: string, secret: string): string {
  const combined = Buffer.from(encoded, "base64");
  if (combined.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Encrypted value is too short to be valid");
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const key = keyBuffer(secret);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext) + decipher.final("utf8");
}
