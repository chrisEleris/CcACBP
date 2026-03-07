import { zValidator } from "@hono/zod-validator";
import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index";
import { querySnippets } from "../db/schema";

const MAX_SQL = 50_000;
const MAX_NAME = 500;

const executeQuerySchema = z.object({
  sql: z.string().min(1).max(MAX_SQL),
  dataSourceId: z.string().max(200).optional(),
});

const createSnippetSchema = z.object({
  name: z.string().min(1).max(MAX_NAME),
  description: z.string().max(MAX_NAME).optional(),
  sql: z.string().min(1).max(MAX_SQL),
  dataSourceId: z.string().max(200).optional(),
});

type SchemaColumn = {
  name: string;
  type: string;
};

type SchemaTable = {
  name: string;
  columns: SchemaColumn[];
};

/**
 * Queries the actual SQLite database schema instead of returning hardcoded data.
 * Reads sqlite_master for table names and PRAGMA table_info for column details.
 */
async function getDbSchema(): Promise<SchemaTable[]> {
  const tablesResult = await db.all<{ name: string }>(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name`,
  );

  const tables: SchemaTable[] = [];
  for (const table of tablesResult) {
    const columnsResult = await db.all<{ name: string; type: string }>(
      sql`SELECT name, type FROM pragma_table_info(${table.name})`,
    );
    tables.push({
      name: table.name,
      columns: columnsResult.map((col) => ({
        name: col.name,
        type: col.type || "TEXT",
      })),
    });
  }

  return tables;
}

export const queryRoutes = new Hono()
  .post("/execute", zValidator("json", executeQuerySchema), async (c) => {
    try {
      const _validated = c.req.valid("json");

      // TODO: Replace with actual query execution against the configured data source
      return c.json({
        data: {
          columns: ["id", "name", "value"],
          rows: [
            { id: "1", name: "sample-row-1", value: "100" },
            { id: "2", name: "sample-row-2", value: "200" },
            { id: "3", name: "sample-row-3", value: "300" },
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

  .get("/schema", async (c) => {
    try {
      const schema = await getDbSchema();
      return c.json({ data: schema });
    } catch (error) {
      console.error("Error fetching database schema:", error);
      return c.json({ message: "Failed to fetch schema" }, 500);
    }
  });
