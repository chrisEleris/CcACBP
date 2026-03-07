import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ── data_sources ──────────────────────────────────────────────────────────────

export const dataSources = sqliteTable("data_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "cloudwatch" | "redshift" | "mysql" | "s3" | "csv"
  config: text("config").notNull(), // JSON string
  status: text("status").notNull().default("disconnected"), // "connected" | "disconnected" | "error"
  lastTestedAt: text("last_tested_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type DataSource = typeof dataSources.$inferSelect;
export type NewDataSource = typeof dataSources.$inferInsert;

// ── saved_reports ─────────────────────────────────────────────────────────────

export const savedReports = sqliteTable("saved_reports", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  query: text("query").notNull(),
  dataSourceId: text("data_source_id"), // nullable — null means local/DuckDB
  visualization: text("visualization").notNull().default("table"), // "table" | "bar" | "line" | "pie" | "area" | "scatter"
  chartConfig: text("chart_config").default("{}"),
  layout: text("layout").default("{}"),
  parameters: text("parameters").default("[]"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type SavedReport = typeof savedReports.$inferSelect;
export type NewSavedReport = typeof savedReports.$inferInsert;

// ── report_executions ─────────────────────────────────────────────────────────

export const reportExecutions = sqliteTable("report_executions", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  status: text("status").notNull(), // "running" | "completed" | "failed"
  rowCount: integer("row_count").default(0),
  durationMs: integer("duration_ms").default(0),
  error: text("error"),
  resultPath: text("result_path"),
  executedAt: text("executed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type ReportExecution = typeof reportExecutions.$inferSelect;
export type NewReportExecution = typeof reportExecutions.$inferInsert;

// ── ai_conversations ──────────────────────────────────────────────────────────

export const aiConversations = sqliteTable("ai_conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  pageContext: text("page_context").notNull(),
  agentType: text("agent_type").notNull().default("general"), // "log-analysis" | "cost-optimization" | "infrastructure" | "security" | "report-builder" | "general"
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;

// ── ai_messages ───────────────────────────────────────────────────────────────

export const aiMessages = sqliteTable("ai_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  metadata: text("metadata").default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type AiMessage = typeof aiMessages.$inferSelect;
export type NewAiMessage = typeof aiMessages.$inferInsert;

// ── report_templates ──────────────────────────────────────────────────────────

export const reportTemplates = sqliteTable("report_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "cost" | "security" | "performance" | "infrastructure" | "logs"
  query: text("query").notNull(),
  visualization: text("visualization").notNull().default("table"),
  chartConfig: text("chart_config").default("{}"),
  parameters: text("parameters").default("[]"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type NewReportTemplate = typeof reportTemplates.$inferInsert;

// ── dashboard_widgets ─────────────────────────────────────────────────────────

export const dashboardWidgets = sqliteTable("dashboard_widgets", {
  id: text("id").primaryKey(),
  reportId: text("report_id"), // nullable
  widgetType: text("widget_type").notNull(), // "chart" | "table" | "metric" | "status"
  title: text("title").notNull(),
  position: text("position").notNull().default("{}"), // JSON {x, y, w, h}
  config: text("config").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type NewDashboardWidget = typeof dashboardWidgets.$inferInsert;

// ── query_snippets ────────────────────────────────────────────────────────────

export const querySnippets = sqliteTable("query_snippets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  sql: text("sql").notNull(),
  dataSourceId: text("data_source_id"), // nullable
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type QuerySnippet = typeof querySnippets.$inferSelect;
export type NewQuerySnippet = typeof querySnippets.$inferInsert;
