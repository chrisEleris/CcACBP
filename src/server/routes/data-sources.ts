import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index";
import { dataSources } from "../db/schema";

const SENSITIVE_CONFIG_KEYS = new Set([
  "password",
  "secret",
  "token",
  "apiKey",
  "api_key",
  "accessKey",
  "access_key",
  "secretKey",
  "secret_key",
  "credentials",
]);

/**
 * Recursively redacts sensitive fields from an object.
 * Replaces values of known credential keys with "***REDACTED***" at any depth.
 */
function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_CONFIG_KEYS.has(key)) {
      redacted[key] = "***REDACTED***";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      redacted[key] = redactObject(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Redacts sensitive fields from a data source config JSON string.
 * Replaces values of known credential keys with "***REDACTED***" at any nesting depth.
 */
function redactConfig(configStr: string): string {
  try {
    const parsed = JSON.parse(configStr) as Record<string, unknown>;
    return JSON.stringify(redactObject(parsed));
  } catch {
    return configStr;
  }
}

type DataSourceRow = typeof dataSources.$inferSelect;

function redactDataSource(row: DataSourceRow): DataSourceRow {
  return { ...row, config: redactConfig(row.config) };
}

const MAX_NAME = 500;
const MAX_CONFIG = 10_000;

const createDataSourceSchema = z.object({
  name: z.string().min(1).max(MAX_NAME),
  type: z.enum(["cloudwatch", "redshift", "mysql", "s3", "csv"]),
  config: z.string().min(1).max(MAX_CONFIG),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
});

const updateDataSourceSchema = z.object({
  name: z.string().min(1).max(MAX_NAME).optional(),
  type: z.enum(["cloudwatch", "redshift", "mysql", "s3", "csv"]).optional(),
  config: z.string().min(1).max(MAX_CONFIG).optional(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
});

export const dataSourceRoutes = new Hono()
  .get("/", async (c) => {
    try {
      const all = await db.select().from(dataSources).orderBy(desc(dataSources.createdAt));
      return c.json({ data: all.map(redactDataSource) });
    } catch (error) {
      console.error("Error listing data sources:", error);
      return c.json({ message: "Failed to list data sources" }, 500);
    }
  })

  .get("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const [row] = await db.select().from(dataSources).where(eq(dataSources.id, id));
      if (!row) {
        return c.json({ message: "Data source not found" }, 404);
      }
      return c.json({ data: redactDataSource(row) });
    } catch (error) {
      console.error("Error getting data source:", error);
      return c.json({ message: "Failed to get data source" }, 500);
    }
  })

  .post("/", zValidator("json", createDataSourceSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const now = new Date().toISOString();
      const [created] = await db
        .insert(dataSources)
        .values({
          id: crypto.randomUUID(),
          name: data.name,
          type: data.type,
          config: data.config,
          status: data.status ?? "disconnected",
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return c.json({ data: redactDataSource(created) }, 201);
    } catch (error) {
      console.error("Error creating data source:", error);
      return c.json({ message: "Failed to create data source" }, 500);
    }
  })

  .put("/:id", zValidator("json", updateDataSourceSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");

      const [existing] = await db.select().from(dataSources).where(eq(dataSources.id, id));
      if (!existing) {
        return c.json({ message: "Data source not found" }, 404);
      }

      const [updated] = await db
        .update(dataSources)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(dataSources.id, id))
        .returning();
      return c.json({ data: redactDataSource(updated) });
    } catch (error) {
      console.error("Error updating data source:", error);
      return c.json({ message: "Failed to update data source" }, 500);
    }
  })

  .delete("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const [existing] = await db.select().from(dataSources).where(eq(dataSources.id, id));
      if (!existing) {
        return c.json({ message: "Data source not found" }, 404);
      }
      await db.delete(dataSources).where(eq(dataSources.id, id));
      return c.json({ data: { message: "Data source deleted" } });
    } catch (error) {
      console.error("Error deleting data source:", error);
      return c.json({ message: "Failed to delete data source" }, 500);
    }
  })

  .post("/:id/test", async (c) => {
    try {
      const id = c.req.param("id");
      const [existing] = await db.select().from(dataSources).where(eq(dataSources.id, id));
      if (!existing) {
        return c.json({ message: "Data source not found" }, 404);
      }

      const now = new Date().toISOString();
      const [updated] = await db
        .update(dataSources)
        .set({ status: "connected", lastTestedAt: now, updatedAt: now })
        .where(eq(dataSources.id, id))
        .returning();

      return c.json({ data: redactDataSource(updated) });
    } catch (error) {
      console.error("Error testing data source connection:", error);
      return c.json({ message: "Failed to test connection" }, 500);
    }
  });
