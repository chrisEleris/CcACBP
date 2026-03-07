import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/index";

export const healthRoute = new Hono()
  .get("/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  })
  .get("/health/db", async (c) => {
    try {
      const result = await db.all<{ name: string }>(
        sql`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
      );

      const tables = result
        .filter((row): row is { name: string } => typeof row.name === "string")
        .map((row) => row.name);

      return c.json({ status: "ok", tables });
    } catch (error) {
      console.error("DB health check error:", error);
      return c.json({ status: "error", message: "Database unavailable" }, 500);
    }
  });
