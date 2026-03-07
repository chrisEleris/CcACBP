import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index";
import { savedReports } from "../db/schema";
import { type NewScheduledReport, scheduledReports } from "../db/schema-scheduled";

const createScheduleSchema = z.object({
  reportId: z.string().min(1),
  cronExpression: z.string().min(1),
  enabled: z.boolean().optional(),
  format: z.enum(["json", "csv", "pdf", "xlsx"]).optional(),
  nextRunAt: z.string().optional(),
});

const updateScheduleSchema = z.object({
  reportId: z.string().min(1).optional(),
  cronExpression: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  format: z.enum(["json", "csv", "pdf", "xlsx"]).optional(),
  nextRunAt: z.string().nullable().optional(),
});

export const scheduledReportRoutes = new Hono()
  .get("/", async (c) => {
    try {
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
        .orderBy(desc(scheduledReports.createdAt));

      const enriched = rows.map((row) => ({
        ...row,
        reportName: row.reportName ?? null,
      }));

      return c.json({ data: enriched });
    } catch (error) {
      console.error("Error listing scheduled reports:", error);
      return c.json({ message: "Failed to list scheduled reports" }, 500);
    }
  })

  .post("/", zValidator("json", createScheduleSchema), async (c) => {
    try {
      const data = c.req.valid("json");
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
