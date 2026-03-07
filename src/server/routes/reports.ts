import { zValidator } from "@hono/zod-validator";
import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index";
import { reportExecutions, reportTemplates, savedReports } from "../db/schema";
import { parsePagination } from "../lib/pagination";

const MAX_NAME = 500;
const MAX_QUERY = 50_000;
const MAX_JSON_CONFIG = 10_000;

const createReportSchema = z.object({
  name: z.string().min(1).max(MAX_NAME),
  description: z.string().max(MAX_NAME).optional(),
  query: z.string().min(1).max(MAX_QUERY),
  visualization: z.enum(["table", "bar", "line", "pie", "area", "scatter"]).optional(),
  chartConfig: z.string().max(MAX_JSON_CONFIG).optional(),
  layout: z.string().max(MAX_JSON_CONFIG).optional(),
  parameters: z.string().max(MAX_JSON_CONFIG).optional(),
  dataSourceId: z.string().max(200).optional(),
});

const updateReportSchema = z.object({
  name: z.string().min(1).max(MAX_NAME).optional(),
  description: z.string().max(MAX_NAME).optional(),
  query: z.string().min(1).max(MAX_QUERY).optional(),
  visualization: z.enum(["table", "bar", "line", "pie", "area", "scatter"]).optional(),
  chartConfig: z.string().max(MAX_JSON_CONFIG).optional(),
  layout: z.string().max(MAX_JSON_CONFIG).optional(),
  parameters: z.string().max(MAX_JSON_CONFIG).optional(),
  dataSourceId: z.string().max(200).nullable().optional(),
});

export const reportRoutes = new Hono()
  .get("/", async (c) => {
    try {
      const pagination = parsePagination(c);
      const all = await db
        .select()
        .from(savedReports)
        .orderBy(desc(savedReports.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset);
      const countRow = await db.get<{ count: number }>(
        sql`select count(*) as count from saved_reports`,
      );
      const total = countRow?.count ?? 0;
      return c.json({
        data: all,
        pagination: { limit: pagination.limit, offset: pagination.offset, total },
      });
    } catch (error) {
      console.error("Error listing reports:", error);
      return c.json({ message: "Failed to list reports" }, 500);
    }
  })

  .get("/templates/list", async (c) => {
    try {
      const pagination = parsePagination(c);
      const templates = await db
        .select()
        .from(reportTemplates)
        .orderBy(desc(reportTemplates.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset);
      const countRow = await db.get<{ count: number }>(
        sql`select count(*) as count from report_templates`,
      );
      const total = countRow?.count ?? 0;
      return c.json({
        data: templates,
        pagination: { limit: pagination.limit, offset: pagination.offset, total },
      });
    } catch (error) {
      console.error("Error listing report templates:", error);
      return c.json({ message: "Failed to list report templates" }, 500);
    }
  })

  .get("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const [row] = await db.select().from(savedReports).where(eq(savedReports.id, id));
      if (!row) {
        return c.json({ message: "Report not found" }, 404);
      }
      return c.json({ data: row });
    } catch (error) {
      console.error("Error getting report:", error);
      return c.json({ message: "Failed to get report" }, 500);
    }
  })

  .post("/", zValidator("json", createReportSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const now = new Date().toISOString();
      const [created] = await db
        .insert(savedReports)
        .values({
          id: crypto.randomUUID(),
          name: data.name,
          description: data.description ?? "",
          query: data.query,
          visualization: data.visualization ?? "table",
          chartConfig: data.chartConfig ?? "{}",
          layout: data.layout ?? "{}",
          parameters: data.parameters ?? "[]",
          dataSourceId: data.dataSourceId ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return c.json({ data: created }, 201);
    } catch (error) {
      console.error("Error creating report:", error);
      return c.json({ message: "Failed to create report" }, 500);
    }
  })

  .put("/:id", zValidator("json", updateReportSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");

      const [existing] = await db.select().from(savedReports).where(eq(savedReports.id, id));
      if (!existing) {
        return c.json({ message: "Report not found" }, 404);
      }

      const [updated] = await db
        .update(savedReports)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(savedReports.id, id))
        .returning();
      return c.json({ data: updated });
    } catch (error) {
      console.error("Error updating report:", error);
      return c.json({ message: "Failed to update report" }, 500);
    }
  })

  .delete("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const [existing] = await db.select().from(savedReports).where(eq(savedReports.id, id));
      if (!existing) {
        return c.json({ message: "Report not found" }, 404);
      }
      await db.transaction(async (tx) => {
        await tx.delete(reportExecutions).where(eq(reportExecutions.reportId, id));
        await tx.delete(savedReports).where(eq(savedReports.id, id));
      });
      return c.json({ data: { message: "Report deleted" } });
    } catch (error) {
      console.error("Error deleting report:", error);
      return c.json({ message: "Failed to delete report" }, 500);
    }
  })

  .post("/:id/execute", async (c) => {
    try {
      const id = c.req.param("id");
      const [existing] = await db.select().from(savedReports).where(eq(savedReports.id, id));
      if (!existing) {
        return c.json({ message: "Report not found" }, 404);
      }

      // Stub: returns simulated execution results until real query engine is wired up.
      const randomBytes = new Uint32Array(2);
      crypto.getRandomValues(randomBytes);
      const rowCount = (randomBytes[0] % 1000) + 1;
      const durationMs = (randomBytes[1] % 2000) + 50;
      const now = new Date().toISOString();

      const [execution] = await db
        .insert(reportExecutions)
        .values({
          id: crypto.randomUUID(),
          reportId: id,
          status: "mock",
          rowCount,
          durationMs,
          error: null,
          resultPath: null,
          executedAt: now,
        })
        .returning();

      return c.json({ data: execution });
    } catch (error) {
      console.error("Error executing report:", error);
      return c.json({ message: "Failed to execute report" }, 500);
    }
  })

  .get("/:id/executions", async (c) => {
    try {
      const id = c.req.param("id");
      const [existing] = await db.select().from(savedReports).where(eq(savedReports.id, id));
      if (!existing) {
        return c.json({ message: "Report not found" }, 404);
      }

      const pagination = parsePagination(c);
      const executions = await db
        .select()
        .from(reportExecutions)
        .where(eq(reportExecutions.reportId, id))
        .orderBy(desc(reportExecutions.executedAt))
        .limit(pagination.limit)
        .offset(pagination.offset);
      const countRow = await db.get<{ count: number }>(
        sql`select count(*) as count from report_executions where report_id = ${id}`,
      );
      const total = countRow?.count ?? 0;

      return c.json({
        data: executions,
        pagination: { limit: pagination.limit, offset: pagination.offset, total },
      });
    } catch (error) {
      console.error("Error listing report executions:", error);
      return c.json({ message: "Failed to list executions" }, 500);
    }
  });
