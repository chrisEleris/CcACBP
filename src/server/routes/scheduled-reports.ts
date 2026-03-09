import { zValidator } from "@hono/zod-validator";
import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index";
import { savedReports } from "../db/schema";
import { type NewScheduledReport, scheduledReports } from "../db/schema-scheduled";
import { parsePagination } from "../lib/pagination";

/**
 * Cron expression validation.
 *
 * Accepts standard 5-field expressions (minute hour day-of-month month weekday).
 * Each field must be structurally valid AND have numeric values within the legal
 * range for its position, preventing values like "99 99 99 99 99" from being stored.
 *
 * Supported syntax per field:
 *   *             wildcard
 *   N             single value
 *   N-M           range
 *   N,M,...       list (each element may itself be a range)
 *   * /N or N/N   step
 */
const CRON_FIELD = /^(\*|[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*)(\/[0-9]+)?$/;

/**
 * Per-field [min, max] ranges for the 5 standard cron fields:
 * index 0 = minute, 1 = hour, 2 = day-of-month, 3 = month, 4 = weekday.
 */
const CRON_FIELD_RANGES: [number, number][] = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day-of-month
  [1, 12], // month
  [0, 7], // weekday (0 and 7 both represent Sunday)
];

/**
 * Extracts every numeric literal from a single cron field token and checks
 * that all of them fall within [min, max].
 */
function isCronFieldInRange(field: string, min: number, max: number): boolean {
  if (field === "*") return true;
  // Strip step suffix (e.g. "*/5" → "*", "1-5/2" → "1-5")
  const base = field.split("/")[0];
  const numbers = base.split(/[-,]/).filter((s) => s !== "*" && s !== "");
  return numbers.every((n) => {
    const v = Number(n);
    return Number.isInteger(v) && v >= min && v <= max;
  });
}

const cronExpression = z
  .string()
  .min(1)
  .refine(
    (val) => {
      const parts = val.trim().split(/\s+/);
      if (parts.length < 5 || parts.length > 6) return false;
      // Validate structural format for each field.
      if (!parts.every((part) => CRON_FIELD.test(part))) return false;
      // Validate numeric ranges for the first 5 standard fields.
      for (let i = 0; i < 5; i++) {
        const [min, max] = CRON_FIELD_RANGES[i];
        if (!isCronFieldInRange(parts[i], min, max)) return false;
      }
      return true;
    },
    { message: "Invalid cron expression. Expected 5 space-separated fields with values in range." },
  );

const createScheduleSchema = z.object({
  reportId: z.string().min(1).max(200),
  cronExpression,
  enabled: z.boolean().optional(),
  format: z.enum(["json", "csv", "pdf", "xlsx"]).optional(),
  nextRunAt: z.string().max(100).optional(),
});

const updateScheduleSchema = z.object({
  reportId: z.string().min(1).max(200).optional(),
  cronExpression: cronExpression.optional(),
  enabled: z.boolean().optional(),
  format: z.enum(["json", "csv", "pdf", "xlsx"]).optional(),
  nextRunAt: z.string().max(100).nullable().optional(),
});

export const scheduledReportRoutes = new Hono()
  .get("/", async (c) => {
    try {
      const pagination = parsePagination(c);
      const rows = await db
        .select({
          id: scheduledReports.id,
          reportId: scheduledReports.reportId,
          cronExpression: scheduledReports.cronExpression,
          enabled: scheduledReports.enabled,
          format: scheduledReports.format,
          lastRunAt: scheduledReports.lastRunAt,
          nextRunAt: scheduledReports.nextRunAt,
          createdAt: scheduledReports.createdAt,
          updatedAt: scheduledReports.updatedAt,
          reportName: savedReports.name,
        })
        .from(scheduledReports)
        .leftJoin(savedReports, eq(scheduledReports.reportId, savedReports.id))
        .orderBy(desc(scheduledReports.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset);

      const enriched = rows.map((row) => ({
        ...row,
        reportName: row.reportName ?? null,
      }));

      const countRow = await db.get<{ count: number }>(
        sql`select count(*) as count from scheduled_reports`,
      );
      const total = countRow?.count ?? 0;

      return c.json({
        data: enriched,
        pagination: { limit: pagination.limit, offset: pagination.offset, total },
      });
    } catch (error) {
      console.error("Error listing scheduled reports:", error);
      return c.json({ message: "Failed to list scheduled reports" }, 500);
    }
  })

  .post("/", zValidator("json", createScheduleSchema), async (c) => {
    try {
      const data = c.req.valid("json");

      // Verify the referenced report exists
      const [report] = await db
        .select()
        .from(savedReports)
        .where(eq(savedReports.id, data.reportId));
      if (!report) {
        return c.json({ message: "Referenced report not found" }, 404);
      }

      const now = new Date().toISOString();

      const newSchedule: NewScheduledReport = {
        id: crypto.randomUUID(),
        reportId: data.reportId,
        cronExpression: data.cronExpression,
        enabled: data.enabled ?? true,
        format: data.format ?? "json",
        lastRunAt: null,
        nextRunAt: data.nextRunAt ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const [created] = await db.insert(scheduledReports).values(newSchedule).returning();

      return c.json({ data: created }, 201);
    } catch (error) {
      console.error("Error creating scheduled report:", error);
      return c.json({ message: "Failed to create scheduled report" }, 500);
    }
  })

  .put("/:id", zValidator("json", updateScheduleSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");

      const [existing] = await db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.id, id));
      if (!existing) {
        return c.json({ message: "Scheduled report not found" }, 404);
      }

      const [updated] = await db
        .update(scheduledReports)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(scheduledReports.id, id))
        .returning();

      return c.json({ data: updated });
    } catch (error) {
      console.error("Error updating scheduled report:", error);
      return c.json({ message: "Failed to update scheduled report" }, 500);
    }
  })

  .delete("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const [existing] = await db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.id, id));
      if (!existing) {
        return c.json({ message: "Scheduled report not found" }, 404);
      }

      await db.delete(scheduledReports).where(eq(scheduledReports.id, id));

      return c.json({ data: { message: "Scheduled report deleted" } });
    } catch (error) {
      console.error("Error deleting scheduled report:", error);
      return c.json({ message: "Failed to delete scheduled report" }, 500);
    }
  })

  .post("/:id/run", async (c) => {
    try {
      const id = c.req.param("id");
      const [existing] = await db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.id, id));
      if (!existing) {
        return c.json({ message: "Scheduled report not found" }, 404);
      }

      const now = new Date().toISOString();
      const [updated] = await db
        .update(scheduledReports)
        .set({ lastRunAt: now, updatedAt: now })
        .where(eq(scheduledReports.id, id))
        .returning();

      return c.json({
        data: {
          status: "completed",
          schedule: updated,
          triggeredAt: now,
        },
      });
    } catch (error) {
      console.error("Error triggering scheduled report:", error);
      return c.json({ message: "Failed to trigger scheduled report" }, 500);
    }
  });
