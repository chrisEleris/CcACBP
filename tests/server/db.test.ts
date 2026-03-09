import { describe, expect, it } from "vitest";

describe("Database schema types", () => {
  it("should export dataSources table with expected columns", async () => {
    const { dataSources } = await import("../../src/server/db/schema");
    expect(dataSources).toBeDefined();
    expect(dataSources.id).toBeDefined();
    expect(dataSources.name).toBeDefined();
    expect(dataSources.type).toBeDefined();
    expect(dataSources.config).toBeDefined();
    expect(dataSources.status).toBeDefined();
    expect(dataSources.lastTestedAt).toBeDefined();
    expect(dataSources.createdAt).toBeDefined();
    expect(dataSources.updatedAt).toBeDefined();
  });

  it("should export savedReports table with expected columns", async () => {
    const { savedReports } = await import("../../src/server/db/schema");
    expect(savedReports).toBeDefined();
    expect(savedReports.id).toBeDefined();
    expect(savedReports.name).toBeDefined();
    expect(savedReports.query).toBeDefined();
    expect(savedReports.visualization).toBeDefined();
    expect(savedReports.dataSourceId).toBeDefined();
    expect(savedReports.chartConfig).toBeDefined();
    expect(savedReports.createdAt).toBeDefined();
    expect(savedReports.updatedAt).toBeDefined();
  });

  it("should export reportExecutions table with expected columns", async () => {
    const { reportExecutions } = await import("../../src/server/db/schema");
    expect(reportExecutions).toBeDefined();
    expect(reportExecutions.id).toBeDefined();
    expect(reportExecutions.reportId).toBeDefined();
    expect(reportExecutions.status).toBeDefined();
    expect(reportExecutions.rowCount).toBeDefined();
    expect(reportExecutions.durationMs).toBeDefined();
    expect(reportExecutions.error).toBeDefined();
    expect(reportExecutions.executedAt).toBeDefined();
  });

  it("should export aiConversations table with expected columns", async () => {
    const { aiConversations } = await import("../../src/server/db/schema");
    expect(aiConversations).toBeDefined();
    expect(aiConversations.id).toBeDefined();
    expect(aiConversations.title).toBeDefined();
    expect(aiConversations.pageContext).toBeDefined();
    expect(aiConversations.agentType).toBeDefined();
    expect(aiConversations.createdAt).toBeDefined();
    expect(aiConversations.updatedAt).toBeDefined();
  });

  it("should export aiMessages table with expected columns", async () => {
    const { aiMessages } = await import("../../src/server/db/schema");
    expect(aiMessages).toBeDefined();
    expect(aiMessages.id).toBeDefined();
    expect(aiMessages.conversationId).toBeDefined();
    expect(aiMessages.role).toBeDefined();
    expect(aiMessages.content).toBeDefined();
    expect(aiMessages.metadata).toBeDefined();
    expect(aiMessages.createdAt).toBeDefined();
  });

  it("should export reportTemplates table with expected columns", async () => {
    const { reportTemplates } = await import("../../src/server/db/schema");
    expect(reportTemplates).toBeDefined();
    expect(reportTemplates.id).toBeDefined();
    expect(reportTemplates.name).toBeDefined();
    expect(reportTemplates.description).toBeDefined();
    expect(reportTemplates.category).toBeDefined();
    expect(reportTemplates.query).toBeDefined();
    expect(reportTemplates.visualization).toBeDefined();
  });

  it("should export dashboardWidgets table with expected columns", async () => {
    const { dashboardWidgets } = await import("../../src/server/db/schema");
    expect(dashboardWidgets).toBeDefined();
    expect(dashboardWidgets.id).toBeDefined();
    expect(dashboardWidgets.reportId).toBeDefined();
    expect(dashboardWidgets.widgetType).toBeDefined();
    expect(dashboardWidgets.title).toBeDefined();
    expect(dashboardWidgets.position).toBeDefined();
    expect(dashboardWidgets.config).toBeDefined();
  });

  it("should export querySnippets table with expected columns", async () => {
    const { querySnippets } = await import("../../src/server/db/schema");
    expect(querySnippets).toBeDefined();
    expect(querySnippets.id).toBeDefined();
    expect(querySnippets.name).toBeDefined();
    expect(querySnippets.sql).toBeDefined();
    expect(querySnippets.dataSourceId).toBeDefined();
    expect(querySnippets.createdAt).toBeDefined();
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
    expect(result[0].value).toBe(1);
  });

  it("should have tables created in the database", async () => {
    const { db } = await import("../../src/server/db/index");
    const { sql } = await import("drizzle-orm");
    const tables = await db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    );
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("data_sources");
    expect(tableNames).toContain("saved_reports");
    expect(tableNames).toContain("report_executions");
    expect(tableNames).toContain("ai_conversations");
    expect(tableNames).toContain("ai_messages");
    expect(tableNames).toContain("query_snippets");
  });
});

describe("Health DB endpoint", () => {
  it("should return ok status with table count (no table names leaked)", async () => {
    const app = (await import("../../src/server/index")).default;
    const res = await app.request("/api/health/db");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; tableCount: number };
    expect(body.status).toBe("ok");
    expect(typeof body.tableCount).toBe("number");
    expect(body.tableCount).toBeGreaterThan(0);
  });
});
