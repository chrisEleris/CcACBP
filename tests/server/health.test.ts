import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

describe("Health endpoint", () => {
  it("should return ok status", async () => {
    const res = await app.request("/api/health");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("should return a valid ISO timestamp", async () => {
    const res = await app.request("/api/health");
    const body = await res.json();

    const parsed = new Date(body.timestamp);
    expect(parsed.toISOString()).toBe(body.timestamp);
  });
});

describe("Health DB endpoint", () => {
  it("GET /api/health/db returns ok status with table count (no table names)", async () => {
    const res = await app.request("/api/health/db");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(typeof body.tableCount).toBe("number");
    expect(body.tableCount).toBeGreaterThan(0);
    // Table names should NOT be exposed — only the count
    expect(body.tables).toBeUndefined();
  });
});

describe("Health AWS endpoint", () => {
  it("GET /api/health/aws returns a structured response with status field", async () => {
    const res = await app.request("/api/health/aws");
    const body = await res.json();

    // In test environment without real AWS credentials the endpoint returns 503,
    // but it must always return a structured JSON body with a status field.
    expect([200, 503]).toContain(res.status);
    expect(typeof body.status).toBe("string");
    expect(body.message !== undefined || body.regionCount !== undefined).toBe(true);
  });

  it("GET /api/health/aws returns 503 with meaningful message when credentials are absent", async () => {
    const res = await app.request("/api/health/aws");
    // Without real AWS credentials this will always be 503 in CI.
    if (res.status === 503) {
      const body = await res.json();
      expect(body.status).toBe("error");
      expect(typeof body.message).toBe("string");
      expect(body.message.length).toBeGreaterThan(0);
    }
  });
});
