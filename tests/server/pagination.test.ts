import { describe, expect, it } from "vitest";
import type { Context } from "hono";
import { parsePagination } from "@server/lib/pagination";

/**
 * Minimal Hono Context mock that satisfies parsePagination's usage:
 * only `c.req.query(key)` is called.
 */
function makeContext(params: Record<string, string | undefined>): Context {
  return {
    req: {
      query: (key: string) => params[key],
    },
  } as unknown as Context;
}

describe("parsePagination", () => {
  describe("defaults", () => {
    it("returns default limit and offset when no query params are provided", () => {
      const c = makeContext({});

      const result = parsePagination(c);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("returns default limit when only offset is provided", () => {
      const c = makeContext({ offset: "10" });

      const result = parsePagination(c);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);
    });

    it("returns default offset when only limit is provided", () => {
      const c = makeContext({ limit: "25" });

      const result = parsePagination(c);

      expect(result.limit).toBe(25);
      expect(result.offset).toBe(0);
    });
  });

  describe("valid values", () => {
    it("respects valid limit and offset values", () => {
      const c = makeContext({ limit: "100", offset: "20" });

      const result = parsePagination(c);

      expect(result.limit).toBe(100);
      expect(result.offset).toBe(20);
    });

    it("accepts limit of 1 (minimum valid value)", () => {
      const c = makeContext({ limit: "1" });

      const result = parsePagination(c);

      expect(result.limit).toBe(1);
    });

    it("accepts limit of 200 (maximum valid value)", () => {
      const c = makeContext({ limit: "200" });

      const result = parsePagination(c);

      expect(result.limit).toBe(200);
    });

    it("accepts offset of 0", () => {
      const c = makeContext({ offset: "0" });

      const result = parsePagination(c);

      expect(result.offset).toBe(0);
    });

    it("accepts large offset values", () => {
      const c = makeContext({ limit: "50", offset: "9999" });

      const result = parsePagination(c);

      expect(result.offset).toBe(9999);
    });
  });

  describe("limit clamping", () => {
    it("falls back to defaults when limit exceeds 200", () => {
      const c = makeContext({ limit: "201" });

      const result = parsePagination(c);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("falls back to defaults when limit is far above max", () => {
      const c = makeContext({ limit: "9999" });

      const result = parsePagination(c);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });
  });

  describe("invalid values fall back to defaults", () => {
    it("falls back to defaults when limit is negative", () => {
      const c = makeContext({ limit: "-1" });

      const result = parsePagination(c);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("falls back to defaults when limit is zero", () => {
      const c = makeContext({ limit: "0" });

      const result = parsePagination(c);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("falls back to defaults when offset is negative", () => {
      const c = makeContext({ offset: "-5" });

      const result = parsePagination(c);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("falls back to defaults when limit is a non-numeric string", () => {
      const c = makeContext({ limit: "abc" });

      const result = parsePagination(c);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("falls back to defaults when offset is a non-numeric string", () => {
      const c = makeContext({ offset: "xyz" });

      const result = parsePagination(c);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("falls back to defaults when limit is a float", () => {
      const c = makeContext({ limit: "10.5" });

      const result = parsePagination(c);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("falls back to defaults when offset is a float", () => {
      const c = makeContext({ offset: "2.7" });

      const result = parsePagination(c);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("falls back to defaults when limit is an empty string", () => {
      const c = makeContext({ limit: "" });

      const result = parsePagination(c);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("falls back to defaults when both limit and offset are invalid", () => {
      const c = makeContext({ limit: "bad", offset: "also-bad" });

      const result = parsePagination(c);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });
  });

  describe("return type", () => {
    it("returns numeric limit and offset (not strings)", () => {
      const c = makeContext({ limit: "30", offset: "15" });

      const result = parsePagination(c);

      expect(typeof result.limit).toBe("number");
      expect(typeof result.offset).toBe("number");
    });

    it("returns only limit and offset properties", () => {
      const c = makeContext({});

      const result = parsePagination(c);

      expect(Object.keys(result)).toEqual(["limit", "offset"]);
    });
  });
});
