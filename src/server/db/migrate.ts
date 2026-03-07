import type { Client } from "@libsql/client";

// Runs the schema creation SQL directly using libsql.
// This is used for development/test environments where drizzle-kit push is not available.
// In production, use `pnpm db:migrate` to run Drizzle-generated migrations.
export async function initializeSchema(client: Client): Promise<void> {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS data_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'disconnected',
      last_tested_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saved_reports (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      query TEXT NOT NULL,
      data_source_id TEXT,
      visualization TEXT NOT NULL DEFAULT 'table',
      chart_config TEXT DEFAULT '{}',
      layout TEXT DEFAULT '{}',
      parameters TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS report_executions (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      status TEXT NOT NULL,
      row_count INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      error TEXT,
      result_path TEXT,
      executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      page_context TEXT NOT NULL,
      agent_type TEXT NOT NULL DEFAULT 'general',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS report_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      query TEXT NOT NULL,
      visualization TEXT NOT NULL DEFAULT 'table',
      chart_config TEXT DEFAULT '{}',
      parameters TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dashboard_widgets (
      id TEXT PRIMARY KEY,
      report_id TEXT,
      widget_type TEXT NOT NULL,
      title TEXT NOT NULL,
      position TEXT NOT NULL DEFAULT '{}',
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS query_snippets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      sql TEXT NOT NULL,
      data_source_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
