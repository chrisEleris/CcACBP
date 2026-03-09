import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { config } from "../config";
import { initializeSchema } from "./migrate";
import * as schema from "./schema";

const databaseUrl = config.DATABASE_URL;

const client = createClient({ url: databaseUrl });

export const db = drizzle(client, { schema });

export type DB = typeof db;

/**
 * Initialises the database schema (idempotent CREATE TABLE IF NOT EXISTS).
 *
 * Call this once from the application entry-point (entry.ts) so that failures
 * are caught in a controlled context where a clear error message can be logged
 * before exit, rather than as an unhandled top-level-await rejection.
 *
 * Tests should call this explicitly in their setup (e.g. beforeAll) or rely on
 * the test setup in vitest.setup.ts / the server index to call it.
 */
export async function initDb(): Promise<void> {
  try {
    await initializeSchema(client);
  } catch (err) {
    console.error("FATAL: Database initialization failed:", err);
    throw err;
  }
}
