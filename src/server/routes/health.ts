import { DescribeRegionsCommand } from "@aws-sdk/client-ec2";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/index";
import { ec2Client } from "../services/aws-clients";

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

      // Return only the count to avoid leaking internal table names.
      return c.json({ status: "ok", tableCount: tables.length });
    } catch (error) {
      console.error("DB health check error:", error);
      return c.json({ status: "error", message: "Database unavailable" }, 500);
    }
  })
  .get("/health/aws", async (c) => {
    try {
      // DescribeRegions is a cheap, read-only call that confirms credentials are valid.
      const result = await ec2Client.send(new DescribeRegionsCommand({ AllRegions: false }));
      const regionCount = result.Regions?.length ?? 0;
      return c.json({ status: "ok", regionCount });
    } catch (error) {
      const message = error instanceof Error ? error.message : "AWS credentials unavailable";
      const isCredentialsError =
        error instanceof Error &&
        (error.name === "CredentialsProviderError" || message.includes("credentials"));
      console.error("AWS health check error:", error);
      return c.json(
        {
          status: "error",
          message: isCredentialsError ? "AWS credentials not configured" : message,
        },
        503,
      );
    }
  });
