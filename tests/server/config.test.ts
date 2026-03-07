import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * Tests for the server config schema validation.
 * We re-declare the schema here to test validation logic in isolation,
 * since importing config.ts directly would trigger process.env parsing.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).default("file:./local.db"),
  AWS_REGION: z.string().min(1).default("us-east-1"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_KEY: z.string().min(1).optional(),
});

describe("Config schema validation", () => {
  it("applies defaults when no env vars are set", () => {
    const result = envSchema.parse({});
    expect(result.PORT).toBe(3000);
    expect(result.DATABASE_URL).toBe("file:./local.db");
    expect(result.AWS_REGION).toBe("us-east-1");
    expect(result.NODE_ENV).toBe("development");
    expect(result.API_KEY).toBeUndefined();
  });

  it("accepts valid custom values", () => {
    const result = envSchema.parse({
      PORT: "8080",
      DATABASE_URL: "file:./prod.db",
      AWS_REGION: "eu-west-1",
      NODE_ENV: "production",
      API_KEY: "my-secret-key",
    });
    expect(result.PORT).toBe(8080);
    expect(result.DATABASE_URL).toBe("file:./prod.db");
    expect(result.AWS_REGION).toBe("eu-west-1");
    expect(result.NODE_ENV).toBe("production");
    expect(result.API_KEY).toBe("my-secret-key");
  });

  it("coerces PORT from string to number", () => {
    const result = envSchema.parse({ PORT: "9999" });
    expect(result.PORT).toBe(9999);
    expect(typeof result.PORT).toBe("number");
  });

  it("rejects negative PORT", () => {
    expect(() => envSchema.parse({ PORT: "-1" })).toThrow();
  });

  it("rejects zero PORT", () => {
    expect(() => envSchema.parse({ PORT: "0" })).toThrow();
  });

  it("rejects non-integer PORT", () => {
    expect(() => envSchema.parse({ PORT: "3.5" })).toThrow();
  });

  it("rejects invalid NODE_ENV", () => {
    expect(() => envSchema.parse({ NODE_ENV: "staging" })).toThrow();
  });

  it("accepts all valid NODE_ENV values", () => {
    for (const env of ["development", "test", "production"]) {
      const result = envSchema.parse({ NODE_ENV: env });
      expect(result.NODE_ENV).toBe(env);
    }
  });

  it("rejects empty DATABASE_URL", () => {
    expect(() => envSchema.parse({ DATABASE_URL: "" })).toThrow();
  });

  it("rejects empty AWS_REGION", () => {
    expect(() => envSchema.parse({ AWS_REGION: "" })).toThrow();
  });

  it("rejects empty API_KEY when provided", () => {
    expect(() => envSchema.parse({ API_KEY: "" })).toThrow();
  });

  it("allows API_KEY to be omitted", () => {
    const result = envSchema.parse({});
    expect(result.API_KEY).toBeUndefined();
  });
});
