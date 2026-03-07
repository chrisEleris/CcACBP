import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * Creates the scheduled_reports table if it does not already exist.
 * Safe to call multiple times (idempotent).
 * Uses the shared db connection to avoid SQLITE_BUSY conflicts.
 */
export async function initializeScheduledSchema(): Promise<void> {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS scheduled_reports (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      format TEXT NOT NULL DEFAULT 'json',
      last_run_at TEXT,
      next_run_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
