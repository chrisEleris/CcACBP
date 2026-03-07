import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const scheduledReports = sqliteTable("scheduled_reports", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  cronExpression: text("cron_expression").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  format: text("format").notNull().default("json"), // "json" | "csv"
  lastRunAt: text("last_run_at"),
  nextRunAt: text("next_run_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type NewScheduledReport = typeof scheduledReports.$inferInsert;
