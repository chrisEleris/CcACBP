import { zValidator } from "@hono/zod-validator";
import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { config } from "../config";
import { db } from "../db/index";
import { dataSources } from "../db/schema";
import { decrypt, encrypt } from "../lib/crypto";
import { parsePagination } from "../lib/pagination";

// Prefix used to distinguish AES-256-GCM encrypted blobs from plaintext.
const ENCRYPTED_PREFIX = "enc:v1:";

/**
 * Encrypts a config JSON string using AES-256-GCM when SECRET_KEY is configured.
 * When SECRET_KEY is not set (development/test without override), the value is stored as plaintext.
 */
function encryptConfig(configStr: string): string {
  if (!config.SECRET_KEY) return configStr;
  return ENCRYPTED_PREFIX + encrypt(configStr, config.SECRET_KEY);
}

/**
 * Decrypts a config value previously encrypted by {@link encryptConfig}.
 * Falls back to returning the raw value unchanged if it is not prefixed
 * (e.g. rows migrated before encryption was introduced, or dev mode).
 */
function decryptConfig(storedValue: string): string {
  if (!storedValue.startsWith(ENCRYPTED_PREFIX)) return storedValue;
  if (!config.SECRET_KEY) {
    // Should not happen in production (entry.ts enforces SECRET_KEY), but
    // guard defensively so we do not expose a raw encrypted blob to callers.
    throw new Error("SECRET_KEY is required to decrypt stored credentials");
  }
  return decrypt(storedValue.slice(ENCRYPTED_PREFIX.length), config.SECRET_KEY);
}

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
function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (typeof value === "object" && value !== null) {
    return redactObject(value as Record<string, unknown>);
  }
  return value;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_CONFIG_KEYS.has(key)) {
      redacted[key] = "***REDACTED***";
    } else {
      redacted[key] = redactValue(value);
    }
  }
  return redacted;
}

/**
 * Redacts sensitive fields from a data source config JSON string.
 * Replaces values of known credential keys with "***REDACTED***" at any nesting depth.
 */
export function redactConfig(configStr: string): string {
  try {
    const parsed = JSON.parse(configStr) as Record<string, unknown>;
    return JSON.stringify(redactObject(parsed));
  } catch {
    // Return a safe placeholder instead of the raw string to prevent credential leakage
    // when the config is not valid JSON (e.g., connection strings, corrupted data).
    return '"[config unavailable]"';
  }
}

type DataSourceRow = typeof dataSources.$inferSelect;

function redactDataSource(row: DataSourceRow): DataSourceRow {
  // Decrypt first, then redact sensitive fields before returning to the caller.
  const decrypted = decryptConfig(row.config);
  return { ...row, config: redactConfig(decrypted) };
}

const MAX_NAME = 500;
const MAX_CONFIG = 10_000;

const jsonString = z
  .string()
  .min(1)
  .max(MAX_CONFIG)
  .refine(
    (v) => {
      try {
        JSON.parse(v);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be valid JSON" },
  );

const createDataSourceSchema = z.object({
  name: z.string().min(1).max(MAX_NAME),
  type: z.enum(["cloudwatch", "redshift", "mysql", "s3", "csv"]),
  config: jsonString,
  status: z.enum(["connected", "disconnected", "error"]).optional(),
});

const updateDataSourceSchema = z.object({
  name: z.string().min(1).max(MAX_NAME).optional(),
  type: z.enum(["cloudwatch", "redshift", "mysql", "s3", "csv"]).optional(),
  config: jsonString.optional(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
});

export const dataSourceRoutes = new Hono()
  .get("/", async (c) => {
    try {
      const pagination = parsePagination(c);
      const all = await db
        .select()
        .from(dataSources)
        .orderBy(desc(dataSources.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset);
      const countRow = await db.get<{ count: number }>(
        sql`select count(*) as count from data_sources`,
      );
      const total = countRow?.count ?? 0;
      return c.json({
        data: all.map(redactDataSource),
        pagination: { limit: pagination.limit, offset: pagination.offset, total },
      });
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
          config: encryptConfig(data.config),
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

      const updatePayload = {
        ...data,
        ...(data.config !== undefined ? { config: encryptConfig(data.config) } : {}),
        updatedAt: new Date().toISOString(),
      };
      const [updated] = await db
        .update(dataSources)
        .set(updatePayload)
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

      // Stub: no real connectivity test is performed yet.
      // We update lastTestedAt but do NOT change status to avoid false confidence.
      const now = new Date().toISOString();
      const [updated] = await db
        .update(dataSources)
        .set({ lastTestedAt: now, updatedAt: now })
        .where(eq(dataSources.id, id))
        .returning();

      return c.json({ data: redactDataSource(updated), mock: true });
    } catch (error) {
      console.error("Error testing data source connection:", error);
      return c.json({ message: "Failed to test connection" }, 500);
    }
  });
