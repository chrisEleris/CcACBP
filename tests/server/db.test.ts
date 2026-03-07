import { describe, expect, it } from "vitest";

describe("Database schema types", () => {
  it("should export dataSources table", async () => {
    const { dataSources } = await import("../../src/server/db/schema");
    expect(dataSources).toBeDefined();
  });

  it("should export savedReports table", async () => {
    const { savedReports } = await import("../../src/server/db/schema");
    expect(savedReports).toBeDefined();
  });

  it("should export reportExecutions table", async () => {
    const { reportExecutions } = await import("../../src/server/db/schema");
    expect(reportExecutions).toBeDefined();
  });

  it("should export aiConversations table", async () => {
    const { aiConversations } = await import("../../src/server/db/schema");
    expect(aiConversations).toBeDefined();
  });

  it("should export aiMessages table", async () => {
    const { aiMessages } = await import("../../src/server/db/schema");
    expect(aiMessages).toBeDefined();
  });

  it("should export reportTemplates table", async () => {
    const { reportTemplates } = await import("../../src/server/db/schema");
    expect(reportTemplates).toBeDefined();
  });

  it("should export dashboardWidgets table", async () => {
    const { dashboardWidgets } = await import("../../src/server/db/schema");
    expect(dashboardWidgets).toBeDefined();
  });

  it("should export querySnippets table", async () => {
    const { querySnippets } = await import("../../src/server/db/schema");
    expect(querySnippets).toBeDefined();
  });
});

describe("Database connection", () => {
  it("should export a db instance", async () => {
    const { db } = await import("../../src/server/db/index");
    expect(db).toBeDefined();
  });

  it("should be able to run a basic query", async () => {
    const { db } = await import("../../src/server/db/index");
    const { sql } = await import("drizzle-orm");
    const result = await db.all<{ value: number }>(sql`SELECT 1 as value`);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("Health DB endpoint", () => {
  it("should return ok status and tables list", async () => {
    const app = (await import("../../src/server/index")).default;
    const res = await app.request("/api/health/db");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; tables: string[] };
    expect(body.status).toBe("ok");
    expect(Array.isArray(body.tables)).toBe(true);
    expect(body.tables.length).toBeGreaterThan(0);
  });
});
