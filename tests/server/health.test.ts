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
  it("GET /api/health/db returns ok status with tables list", async () => {
    const res = await app.request("/api/health/db");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(Array.isArray(body.tables)).toBe(true);
    expect(body.tables.length).toBeGreaterThan(0);
  });

  it("GET /api/health/db includes known application tables", async () => {
    const res = await app.request("/api/health/db");
    const body = await res.json();

    expect(body.tables).toContain("data_sources");
    expect(body.tables).toContain("saved_reports");
    expect(body.tables).toContain("ai_conversations");
    expect(body.tables).toContain("scheduled_reports");
  });
});
