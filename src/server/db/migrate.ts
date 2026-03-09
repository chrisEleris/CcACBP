import type { Client } from "@libsql/client";

// Runs the schema creation SQL directly using libsql.
// This is used for development/test environments where drizzle-kit push is not available.
// In production, use `pnpm db:migrate` to run Drizzle-generated migrations.
export async function initializeSchema(client: Client): Promise<void> {
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS data_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('cloudwatch','redshift','mysql','s3','csv')),
      config TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'disconnected' CHECK(status IN ('connected','disconnected','error')),
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
      visualization TEXT NOT NULL DEFAULT 'table' CHECK(visualization IN ('table','bar','line','pie','area','scatter')),
      chart_config TEXT DEFAULT '{}',
      layout TEXT DEFAULT '{}',
      parameters TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS report_executions (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('running','completed','failed','mock')),
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
      agent_type TEXT NOT NULL DEFAULT 'general' CHECK(agent_type IN ('log-analysis','cost-optimization','infrastructure','security','report-builder','general')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS report_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('cost','security','performance','infrastructure','logs')),
      query TEXT NOT NULL,
      visualization TEXT NOT NULL DEFAULT 'table' CHECK(visualization IN ('table','bar','line','pie','area','scatter')),
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

    CREATE TABLE IF NOT EXISTS scheduled_reports (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
      cron_expression TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      format TEXT NOT NULL DEFAULT 'json' CHECK(format IN ('json','csv','pdf','xlsx')),
      last_run_at TEXT,
      next_run_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS report_executions_report_id_idx ON report_executions(report_id);

    CREATE INDEX IF NOT EXISTS ai_messages_conversation_id_idx ON ai_messages(conversation_id);

    CREATE INDEX IF NOT EXISTS scheduled_reports_report_id_idx ON scheduled_reports(report_id);
  `);
}
