import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index";
import { querySnippets } from "../db/schema";

const executeQuerySchema = z.object({
  sql: z.string().min(1),
  dataSourceId: z.string().optional(),
});

const createSnippetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sql: z.string().min(1),
  dataSourceId: z.string().optional(),
});

type SchemaColumn = {
  name: string;
  type: string;
};

type SchemaTable = {
  name: string;
  columns: SchemaColumn[];
};

const mockSchema: SchemaTable[] = [
  {
    name: "data_sources",
    columns: [
      { name: "id", type: "TEXT" },
      { name: "name", type: "TEXT" },
      { name: "type", type: "TEXT" },
      { name: "config", type: "TEXT" },
      { name: "status", type: "TEXT" },
      { name: "last_tested_at", type: "TEXT" },
      { name: "created_at", type: "TEXT" },
      { name: "updated_at", type: "TEXT" },
    ],
  },
  {
    name: "saved_reports",
    columns: [
      { name: "id", type: "TEXT" },
      { name: "name", type: "TEXT" },
      { name: "description", type: "TEXT" },
      { name: "query", type: "TEXT" },
      { name: "data_source_id", type: "TEXT" },
      { name: "visualization", type: "TEXT" },
      { name: "chart_config", type: "TEXT" },
      { name: "layout", type: "TEXT" },
      { name: "parameters", type: "TEXT" },
      { name: "created_at", type: "TEXT" },
      { name: "updated_at", type: "TEXT" },
    ],
  },
  {
    name: "report_executions",
    columns: [
      { name: "id", type: "TEXT" },
      { name: "report_id", type: "TEXT" },
      { name: "status", type: "TEXT" },
      { name: "row_count", type: "INTEGER" },
      { name: "duration_ms", type: "INTEGER" },
      { name: "error", type: "TEXT" },
      { name: "result_path", type: "TEXT" },
      { name: "executed_at", type: "TEXT" },
    ],
  },
  {
    name: "ai_conversations",
    columns: [
      { name: "id", type: "TEXT" },
      { name: "title", type: "TEXT" },
      { name: "page_context", type: "TEXT" },
      { name: "agent_type", type: "TEXT" },
      { name: "created_at", type: "TEXT" },
      { name: "updated_at", type: "TEXT" },
    ],
  },
  {
    name: "ai_messages",
    columns: [
      { name: "id", type: "TEXT" },
      { name: "conversation_id", type: "TEXT" },
      { name: "role", type: "TEXT" },
      { name: "content", type: "TEXT" },
      { name: "metadata", type: "TEXT" },
      { name: "created_at", type: "TEXT" },
    ],
  },
  {
    name: "report_templates",
    columns: [
      { name: "id", type: "TEXT" },
      { name: "name", type: "TEXT" },
      { name: "description", type: "TEXT" },
      { name: "category", type: "TEXT" },
      { name: "query", type: "TEXT" },
      { name: "visualization", type: "TEXT" },
      { name: "chart_config", type: "TEXT" },
      { name: "parameters", type: "TEXT" },
      { name: "created_at", type: "TEXT" },
    ],
  },
  {
    name: "dashboard_widgets",
    columns: [
      { name: "id", type: "TEXT" },
      { name: "report_id", type: "TEXT" },
      { name: "widget_type", type: "TEXT" },
      { name: "title", type: "TEXT" },
      { name: "position", type: "TEXT" },
      { name: "config", type: "TEXT" },
      { name: "created_at", type: "TEXT" },
    ],
  },
  {
    name: "query_snippets",
    columns: [
      { name: "id", type: "TEXT" },
      { name: "name", type: "TEXT" },
      { name: "description", type: "TEXT" },
      { name: "sql", type: "TEXT" },
      { name: "data_source_id", type: "TEXT" },
      { name: "created_at", type: "TEXT" },
    ],
  },
];

export const queryRoutes = new Hono()
  .post("/execute", zValidator("json", executeQuerySchema), async (c) => {
    try {
      const _validated = c.req.valid("json");

      return c.json({
        data: {
          columns: ["id", "name", "value"],
          rows: [
            ["1", "sample-row-1", "100"],
            ["2", "sample-row-2", "200"],
            ["3", "sample-row-3", "300"],
          ],
          rowCount: 3,
          durationMs: 42,
        },
      });
    } catch (error) {
      console.error("Error executing query:", error);
      return c.json({ message: "Failed to execute query" }, 500);
    }
  })

  .get("/snippets", async (c) => {
    try {
      const snippets = await db.select().from(querySnippets).orderBy(desc(querySnippets.createdAt));
      return c.json({ data: snippets });
    } catch (error) {
      console.error("Error listing query snippets:", error);
      return c.json({ message: "Failed to list snippets" }, 500);
    }
  })

  .post("/snippets", zValidator("json", createSnippetSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const now = new Date().toISOString();
      const [created] = await db
        .insert(querySnippets)
        .values({
          id: crypto.randomUUID(),
          name: data.name,
          description: data.description ?? "",
          sql: data.sql,
          dataSourceId: data.dataSourceId ?? null,
          createdAt: now,
        })
        .returning();
      return c.json({ data: created }, 201);
    } catch (error) {
      console.error("Error saving query snippet:", error);
      return c.json({ message: "Failed to save snippet" }, 500);
    }
  })

  .delete("/snippets/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const [existing] = await db.select().from(querySnippets).where(eq(querySnippets.id, id));
      if (!existing) {
        return c.json({ message: "Snippet not found" }, 404);
      }
      await db.delete(querySnippets).where(eq(querySnippets.id, id));
      return c.json({ data: { message: "Snippet deleted" } });
    } catch (error) {
      console.error("Error deleting query snippet:", error);
      return c.json({ message: "Failed to delete snippet" }, 500);
    }
  })

  .get("/schema", (c) => {
    return c.json({ data: mockSchema });
  });
