# Database Architecture Research: Reporting & Analytics Suite

**Author:** Solution Architect
**Date:** 2026-03-01
**Status:** Research Complete — Ready for ADR Decision
**Scope:** Database selection and schema design for a cross-source reporting engine built on the existing Hono/TypeScript/Drizzle stack

---

## Executive Summary

The CcACBP platform already ingests live data from AWS services (CloudWatch, Cost Explorer, EC2, S3, IAM, Lambda, ECS) and is structured as a Hono API backend with a React/Vite frontend. Adding a reporting/analytics capability requires solving two distinct problems that must not be conflated:

1. **Application state persistence** — saved reports, user preferences, AI conversation history, data source configurations, dashboard layouts. These are OLTP workloads: frequent small reads/writes, transactional integrity, low latency.

2. **Analytical query execution** — cross-source joins of ingested data (CloudWatch metrics + Redshift results + MySQL exports), aggregations, time-series analysis, ad-hoc GROUP BY / window functions. These are OLAP workloads: large scans, column-oriented access, infrequent but expensive queries.

Conflating these two into one database is the primary architectural mistake to avoid.

**Recommendation: Dual-engine hybrid architecture**
- SQLite (libsql/Turso) for application state in dev; PostgreSQL in production
- DuckDB as the embedded analytical engine for cross-source query execution
- Drizzle ORM manages the application DB; DuckDB's native Node.js bindings manage the analytical layer
- A thin "query federation" service layer orchestrates the two

---

## 1. Candidate Database Analysis

### 1.1 SQLite via better-sqlite3 or libsql/Turso

**What it is:** Embedded, serverless, file-based relational database. `better-sqlite3` is synchronous; `libsql` is the Turso fork that adds async, replication, and edge capabilities.

**Strengths for this use case:**
- Zero-config local development — already the stated tech-stack choice for dev
- `better-sqlite3` is synchronous which pairs cleanly with Hono's sync-friendly middleware
- libsql/Turso provides a managed cloud replica with the same SQLite dialect, making the dev-to-prod story trivial for application state
- Drizzle has first-class SQLite support with identical schema definitions that can target either better-sqlite3 or libsql
- For application state (reports, preferences, configs), SQLite's OLTP profile is exactly right — these tables will have hundreds of thousands of rows at most, never terabytes

**Weaknesses for this use case:**
- Poor analytical performance at scale: no columnar storage, no vectorized execution, no parallel query processing
- WAL mode helps concurrency but SQLite is fundamentally single-writer
- JSON1 extension helps with semi-structured cached data but is not a substitute for a real analytical engine
- Cross-database JOINs require `ATTACH DATABASE`, which is fragile and not supported by Drizzle
- Not suitable for caching tens of millions of CloudWatch metric data points and then running window functions over them

**Verdict: Use SQLite (libsql) for the application state database only. Do not attempt to run analytical queries against it.**

---

### 1.2 PostgreSQL via Drizzle + pg/postgres.js

**What it is:** Full-featured open-source RDBMS. The most complete SQL implementation outside of commercial databases.

**Strengths for this use case:**
- Excellent analytical capabilities for moderate data volumes: window functions, CTEs, LATERAL joins, JSONB operators, partial indexes, materialized views
- `pg_trgm`, full-text search, and JSONB make it viable for storing semi-structured cached API results
- Drizzle has full PostgreSQL support with zero dialect switching cost
- Managed options: Railway, Neon (serverless PostgreSQL with branching — excellent for dev/prod parity), Supabase, AWS RDS
- Horizontal read scaling via read replicas
- Mature ecosystem: pgvector for AI embeddings, TimescaleDB extension for time-series (CloudWatch metrics fit perfectly)

**Weaknesses for this use case:**
- Requires a running server (no embedded mode) — dev setup is heavier than SQLite
- True columnar analytics (DuckDB-tier performance) requires TimescaleDB or columnar extensions like cstore_fdw
- Full-table scans on multi-hundred-GB analytical workloads are slow without proper partitioning
- Managing schema migrations across SQLite-dev / PostgreSQL-prod adds complexity (Drizzle handles this reasonably but dialect differences surface at edges — e.g., `text` vs `varchar`, `integer` primary keys vs `serial`/`uuid`)

**Verdict: Strong candidate for production application state database. Also viable as the sole database if the analytical workloads are moderate (< 50M rows, queries < 10 seconds acceptable). Pair with TimescaleDB extension for time-series if the team wants to avoid DuckDB complexity.**

---

### 1.3 DuckDB

**What it is:** Embedded, in-process OLAP database. Runs inside the Node.js process. No server required. Columnar storage, vectorized execution, SIMD-optimized.

**Strengths for this use case:**
- Exceptional analytical performance: 10-100x faster than SQLite/PostgreSQL for column scans, aggregations, and window functions on the same hardware
- Native support for reading Parquet, CSV, JSON, and Arrow format directly — enables querying cached API results from S3 without loading into tables first
- `duckdb-async` (npm: `duckdb` or newer `@duckdb/node-api`) provides async Node.js bindings
- Cross-source federation via DuckDB's `httpfs`, `sqlite_scanner`, and `postgres_scanner` extensions: DuckDB can directly query a PostgreSQL database or an attached SQLite file as external tables, then JOIN those with in-memory ingested data
- Zero infrastructure: embedded in the Node.js process like SQLite, no separate service to deploy
- Excellent for the "data warehouse lite" pattern: ingest JSON from CloudWatch API, cache as Parquet files in S3 or local disk, query via DuckDB on demand
- `CREATE TABLE AS SELECT` from external sources (Parquet on S3, CSV files, direct PostgreSQL FDW) enables the cross-source JOIN requirement cleanly

**Weaknesses for this use case:**
- Not designed for concurrent writes: DuckDB is OLAP-only, not suitable for storing application state (reports, user prefs, conversation history)
- Node.js bindings are less mature than SQLite's — `@duckdb/node-api` is the newer recommended package but API is still evolving
- No Drizzle ORM support — DuckDB must be queried with raw SQL or a lightweight query builder
- Not appropriate for transactional OLTP workloads
- Memory consumption: DuckDB can use significant RAM during large analytical queries (configurable via `SET memory_limit`)
- Persistence model is different — DuckDB files are not as battle-tested in production as PostgreSQL

**Verdict: Excellent as the analytical query engine. Do not use as the application database. Use alongside SQLite or PostgreSQL.**

---

### 1.4 Hybrid: SQLite/PostgreSQL (app state) + DuckDB (analytics)

**What it is:** Two co-located database engines, each used for its optimal workload. The application server hosts both.

**Strengths for this use case:**
- Clean separation of concerns aligns exactly with the two distinct workload types
- Dev experience: SQLite (better-sqlite3) + DuckDB in-process — zero infrastructure, `pnpm dev` just works
- Production: PostgreSQL (Neon/RDS) + DuckDB in-process — DuckDB uses `postgres_scanner` to JOIN across the two engines
- DuckDB's `sqlite_scanner` allows it to read the dev SQLite file directly, so dev and prod analytical queries run against the same logical schema
- Drizzle continues to manage all application state (migrations, type-safe queries, schema evolution) — its scope stays narrow and its strengths are preserved
- DuckDB handles the "hard" part: joining CloudWatch time-series data + Redshift query results + MySQL exports without ETL pipelines
- Cost: DuckDB is free and embedded; PostgreSQL costs only for managed hosting; no separate data warehouse service needed
- Parquet-based caching: ingested external data (CloudWatch metrics, Redshift results) can be written to Parquet files, then queried by DuckDB on demand — this is the "data warehouse lite" pattern

**Weaknesses for this use case:**
- Two database systems to understand and maintain
- DuckDB does not have Drizzle support, so analytical queries are raw SQL strings — type safety requires manual Zod schemas on results
- DuckDB's `postgres_scanner` and `sqlite_scanner` extensions add read-only cross-source access but are not a substitute for proper ETL if data volumes grow to hundreds of GB
- Operational complexity increases slightly in production (DuckDB process state, memory limits, concurrent access patterns)

**Verdict: This is the recommended architecture. It optimally matches each workload to the right engine, preserves the existing Drizzle/SQLite dev setup, and adds DuckDB as a zero-infrastructure analytical engine.**

---

## 2. How Drizzle Handles Multiple Database Connections

Drizzle ORM does not natively support querying across two different databases in a single query. It manages one connection pool per `drizzle()` instance. The correct pattern is:

```typescript
// src/server/db/app-db.ts — Application state (SQLite dev / PostgreSQL prod)
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema/app-schema";

const sqlite = new Database(process.env.APP_DB_PATH ?? "./data/app.db");
export const appDb = drizzle(sqlite, { schema });

// src/server/db/analytics-db.ts — DuckDB analytical engine (no Drizzle)
import { Database } from "@duckdb/node-api";

let _analyticsDb: Database | null = null;

export async function getAnalyticsDb(): Promise<Database> {
  if (!_analyticsDb) {
    _analyticsDb = await Database.create(
      process.env.ANALYTICS_DB_PATH ?? "./data/analytics.duckdb"
    );
  }
  return _analyticsDb;
}
```

Key pattern: Drizzle owns the application DB (full ORM, migrations, type-safe queries). DuckDB owns the analytical layer (raw SQL, Zod-validated results). The two never share a transaction boundary — they are coordinated at the service layer, not the database layer.

For production PostgreSQL, the switch is a one-line change in `app-db.ts`:

```typescript
// Production variant
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);
export const appDb = drizzle(sql, { schema });
```

Drizzle's schema definitions are identical between SQLite and PostgreSQL for all common types (`text`, `integer`, `boolean`, `timestamp`). Only PostgreSQL-specific types (arrays, JSONB, enums) require dialect-specific imports. Keeping schema definitions clean of dialect-specific types until production migration is needed preserves the dev/prod parity.

---

## 3. Data Warehouse Lite Pattern in TypeScript

The "data warehouse lite" pattern for this use case:

```
External Sources                Ingestion Layer            Analytical Store
─────────────────              ─────────────────          ─────────────────
CloudWatch Metrics  ────────►  Connector Service  ──────► Parquet Files on disk/S3
Redshift Queries    ────────►  (Hono route)       ──────► DuckDB external tables
MySQL Exports       ────────►                     ──────► In-memory DuckDB tables

                                                  ◄──────  DuckDB query engine
                                                           (JOIN across all sources)

Application State              Drizzle ORM
─────────────────              ─────────────────
Saved Reports       ────────►  SQLite / PostgreSQL
Report Configs      ────────►  (Drizzle schema)
User Preferences    ────────►
AI Conversations    ────────►
Dashboard Layouts   ────────►
Data Source Creds   ────────►  (encrypted at rest)
```

DuckDB query patterns for cross-source federation:

```sql
-- Join CloudWatch metrics (from cached Parquet) with Redshift query results (from CSV cache)
SELECT
  cw.timestamp,
  cw.metric_name,
  cw.value AS cloudwatch_value,
  rs.query_execution_time,
  rs.rows_affected
FROM
  read_parquet('./data/cache/cloudwatch/*.parquet') AS cw
  JOIN read_csv('./data/cache/redshift/query_results.csv') AS rs
    ON cw.timestamp::DATE = rs.execution_date
WHERE cw.namespace = 'AWS/ECS'
  AND cw.timestamp >= NOW() - INTERVAL '7 days'
ORDER BY cw.timestamp DESC;
```

This query requires zero ETL pipeline, zero separate data warehouse service, and runs in-process.

---

## 4. Report Builder Schema Design

### 4.1 Application Database Schema (Drizzle — SQLite/PostgreSQL)

The application database stores everything that is user-generated or configuration-driven. It never stores raw metric data at scale.

```typescript
// src/server/db/schema/app-schema.ts

import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ── Data Source Configurations ─────────────────────────────────────────────

export const dataSources = sqliteTable("data_sources", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["cloudwatch", "redshift", "mysql", "postgres", "s3_csv", "s3_parquet"],
  }).notNull(),
  config: text("config").notNull(), // JSON: encrypted connection params
  status: text("status", {
    enum: ["connected", "disconnected", "error", "testing"],
  }).notNull().default("disconnected"),
  lastTestedAt: text("last_tested_at"),
  lastErrorMessage: text("last_error_message"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── Saved Queries ─────────────────────────────────────────────────────────

export const savedQueries = sqliteTable("saved_queries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  queryType: text("query_type", {
    enum: ["sql", "cloudwatch_metrics", "cloudwatch_logs", "redshift", "cross_source"],
  }).notNull(),
  queryDefinition: text("query_definition").notNull(), // JSON: full query spec
  dataSourceIds: text("data_source_ids").notNull(), // JSON array of data_source IDs
  resultSchema: text("result_schema"), // JSON: expected column definitions
  tags: text("tags"), // JSON array of strings
  isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── Report Templates ──────────────────────────────────────────────────────

export const reportTemplates = sqliteTable("report_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category", {
    enum: ["infrastructure", "cost", "security", "performance", "custom"],
  }).notNull().default("custom"),
  layout: text("layout").notNull(), // JSON: grid layout config
  widgets: text("widgets").notNull(), // JSON array of widget definitions
  defaultFilters: text("default_filters"), // JSON: filter presets
  tags: text("tags"), // JSON array
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── Saved Reports (instances of templates with specific data) ─────────────

export const savedReports = sqliteTable("saved_reports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  templateId: text("template_id").references(() => reportTemplates.id),
  queryIds: text("query_ids").notNull(), // JSON array of saved_query IDs
  parameters: text("parameters"), // JSON: runtime parameter overrides
  schedule: text("schedule"), // JSON: cron-based refresh config or null
  lastRunAt: text("last_run_at"),
  lastRunStatus: text("last_run_status", {
    enum: ["pending", "running", "success", "error"],
  }),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── Query Result Cache (metadata only — actual data in DuckDB or Parquet) ─

export const queryResultCache = sqliteTable("query_result_cache", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  queryId: text("query_id").references(() => savedQueries.id),
  queryHash: text("query_hash").notNull(), // SHA-256 of query + params
  rowCount: integer("row_count"),
  columnCount: integer("column_count"),
  storagePath: text("storage_path"), // Path to Parquet file with actual data
  storageType: text("storage_type", {
    enum: ["parquet_local", "parquet_s3", "duckdb_table", "json_inline"],
  }).notNull(),
  inlineData: text("inline_data"), // JSON for small results (< 100 rows)
  expiresAt: text("expires_at"),
  executionMs: integer("execution_ms"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── Dashboard Configurations ──────────────────────────────────────────────

export const dashboards = sqliteTable("dashboards", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  layout: text("layout").notNull(), // JSON: widget grid positions
  widgets: text("widgets").notNull(), // JSON array: { queryId, chartType, title, options }
  filters: text("filters"), // JSON: global filter state
  refreshIntervalSeconds: integer("refresh_interval_seconds"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── User Preferences ──────────────────────────────────────────────────────

export const userPreferences = sqliteTable("user_preferences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique(),
  defaultDashboardId: text("default_dashboard_id").references(() => dashboards.id),
  theme: text("theme", { enum: ["light", "dark", "system"] }).notNull().default("system"),
  timezone: text("timezone").notNull().default("UTC"),
  dateFormat: text("date_format").notNull().default("YYYY-MM-DD"),
  defaultTimeRange: text("default_time_range").notNull().default("7d"),
  preferences: text("preferences"), // JSON: catch-all for additional prefs
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── AI Conversation History ───────────────────────────────────────────────

export const aiConversations = sqliteTable("ai_conversations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title"),
  context: text("context", {
    enum: ["report_builder", "query_assistant", "log_analysis", "general"],
  }).notNull().default("general"),
  reportId: text("report_id").references(() => savedReports.id),
  queryId: text("query_id").references(() => savedQueries.id),
  metadata: text("metadata"), // JSON: additional context (e.g., which data sources were in scope)
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const aiMessages = sqliteTable("ai_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => aiConversations.id),
  role: text("role", { enum: ["user", "assistant", "system", "tool"] }).notNull(),
  content: text("content").notNull(),
  toolName: text("tool_name"), // If role = "tool"
  toolCallId: text("tool_call_id"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  modelId: text("model_id"),
  latencyMs: integer("latency_ms"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── Agent Prompt Templates ────────────────────────────────────────────────

export const agentPromptTemplates = sqliteTable("agent_prompt_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  agentType: text("agent_type", {
    enum: ["query_builder", "log_analyzer", "cost_optimizer", "anomaly_detector", "custom"],
  }).notNull(),
  systemPrompt: text("system_prompt").notNull(),
  userPromptTemplate: text("user_prompt_template").notNull(), // Handlebars-style template
  variables: text("variables"), // JSON: variable definitions with types/defaults
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── Type Exports ──────────────────────────────────────────────────────────

export type DataSource = typeof dataSources.$inferSelect;
export type NewDataSource = typeof dataSources.$inferInsert;
export type SavedQuery = typeof savedQueries.$inferSelect;
export type NewSavedQuery = typeof savedQueries.$inferInsert;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type NewReportTemplate = typeof reportTemplates.$inferInsert;
export type SavedReport = typeof savedReports.$inferSelect;
export type NewSavedReport = typeof savedReports.$inferInsert;
export type QueryResultCache = typeof queryResultCache.$inferSelect;
export type NewQueryResultCache = typeof queryResultCache.$inferInsert;
export type Dashboard = typeof dashboards.$inferSelect;
export type NewDashboard = typeof dashboards.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;
export type AiMessage = typeof aiMessages.$inferSelect;
export type NewAiMessage = typeof aiMessages.$inferInsert;
export type AgentPromptTemplate = typeof agentPromptTemplates.$inferSelect;
export type NewAgentPromptTemplate = typeof agentPromptTemplates.$inferInsert;
```

### 4.2 DuckDB Analytical Layer (No Drizzle — Raw SQL with Zod validation)

DuckDB is not managed by Drizzle. Instead, a dedicated service module owns the DuckDB connection and exposes typed query functions.

```typescript
// src/server/db/analytics-db.ts

import { Database } from "@duckdb/node-api";
import { z } from "zod";

let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.create(
      process.env.ANALYTICS_DB_PATH ?? ":memory:"
    );
    await initializeExtensions(_db);
  }
  return _db;
}

async function initializeExtensions(db: Database): Promise<void> {
  const conn = await db.connect();
  try {
    // Install and load required extensions
    await conn.run("INSTALL httpfs; LOAD httpfs;");
    await conn.run("INSTALL parquet; LOAD parquet;");
    await conn.run("INSTALL json; LOAD json;");
    // sqlite_scanner allows reading the app SQLite DB for reference data
    await conn.run("INSTALL sqlite_scanner; LOAD sqlite_scanner;");

    // Configure S3 access for Parquet cache
    if (process.env.AWS_REGION) {
      await conn.run(`
        SET s3_region = '${process.env.AWS_REGION}';
        SET s3_access_key_id = '${process.env.AWS_ACCESS_KEY_ID ?? ""}';
        SET s3_secret_access_key = '${process.env.AWS_SECRET_ACCESS_KEY ?? ""}';
      `);
    }

    // Memory limit to prevent OOM in production
    await conn.run("SET memory_limit = '1GB';");
    await conn.run("SET threads = 4;");
  } finally {
    await conn.close();
  }
}

// ── Cross-Source Query Execution ─────────────────────────────────────────

const crossSourceQueryResultSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
  columnNames: z.array(z.string()),
  rowCount: z.number(),
  executionMs: z.number(),
});

export type CrossSourceQueryResult = z.infer<typeof crossSourceQueryResultSchema>;

export async function executeCrossSourceQuery(
  sql: string,
  params: Record<string, unknown> = {}
): Promise<CrossSourceQueryResult> {
  const db = await getDb();
  const conn = await db.connect();
  const startMs = Date.now();

  try {
    // DuckDB supports $param_name syntax for named parameters
    const result = await conn.query(sql, params);
    const rows = result.toArray().map((row) => Object.fromEntries(
      Object.entries(row as Record<string, unknown>)
    ));

    return crossSourceQueryResultSchema.parse({
      rows,
      columnNames: result.columnNames,
      rowCount: rows.length,
      executionMs: Date.now() - startMs,
    });
  } finally {
    await conn.close();
  }
}

// ── Parquet Cache Management ─────────────────────────────────────────────

export async function cacheToParquet(
  data: Record<string, unknown>[],
  outputPath: string
): Promise<void> {
  if (data.length === 0) return;

  const db = await getDb();
  const conn = await db.connect();

  try {
    // Load JSON data into DuckDB, then write as Parquet
    const jsonStr = JSON.stringify(data);
    await conn.run(`
      COPY (SELECT * FROM read_json_auto('${jsonStr}'))
      TO '${outputPath}' (FORMAT PARQUET, COMPRESSION ZSTD)
    `);
  } finally {
    await conn.close();
  }
}

// ── CloudWatch Metrics Query Builder ────────────────────────────────────

export async function queryCloudWatchCache(params: {
  namespace: string;
  metricName: string;
  startTime: Date;
  endTime: Date;
  groupBy?: string[];
}): Promise<CrossSourceQueryResult> {
  const parquetGlob = `./data/cache/cloudwatch/${params.namespace}/*.parquet`;

  const groupByClause = params.groupBy?.length
    ? `GROUP BY ${params.groupBy.join(", ")}`
    : "";

  const sql = `
    SELECT
      timestamp,
      namespace,
      metric_name,
      dimension_name,
      dimension_value,
      AVG(value) AS avg_value,
      MAX(value) AS max_value,
      MIN(value) AS min_value,
      COUNT(*) AS data_points
    FROM read_parquet('${parquetGlob}')
    WHERE
      namespace = '${params.namespace}'
      AND metric_name = '${params.metricName}'
      AND timestamp BETWEEN '${params.startTime.toISOString()}'
        AND '${params.endTime.toISOString()}'
    ${groupByClause}
    ORDER BY timestamp DESC
  `;

  return executeCrossSourceQuery(sql);
}
```

---

## 5. Environment-Based Database Configuration

The key to dev/prod parity is environment-driven database selection with identical Drizzle schema.

```typescript
// src/server/db/index.ts

import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import Database from "better-sqlite3";
import postgres from "postgres";
import * as schema from "./schema/app-schema";

function createDb() {
  const dbType = process.env.DB_TYPE ?? "sqlite";

  if (dbType === "postgres") {
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    return drizzlePostgres(sql, { schema });
  }

  // Default: SQLite for local dev
  const sqlite = new Database(process.env.APP_DB_PATH ?? "./data/app.db");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzleSqlite(sqlite, { schema });
}

export const db = createDb();
export type AppDb = typeof db;
```

Environment variables (`.env.example`):
```
# Database
DB_TYPE=sqlite                          # "sqlite" | "postgres"
APP_DB_PATH=./data/app.db               # SQLite only
DATABASE_URL=postgresql://...           # PostgreSQL only

# DuckDB
ANALYTICS_DB_PATH=./data/analytics.duckdb
ANALYTICS_CACHE_DIR=./data/cache

# AWS (for S3 Parquet cache)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
ANALYTICS_S3_BUCKET=
```

---

## 6. Decision Matrix

| Criterion | SQLite only | PostgreSQL only | DuckDB only | SQLite + DuckDB | PostgreSQL + DuckDB |
|-----------|-------------|-----------------|-------------|------------------|----------------------|
| Dev simplicity | Excellent | Good | Poor | Excellent | Good |
| App state (OLTP) | Excellent | Excellent | Poor | Excellent | Excellent |
| Analytical queries | Poor | Good | Excellent | Good | Excellent |
| Cross-source JOINs | Poor | Poor | Excellent | Good | Excellent |
| Drizzle compatibility | Full | Full | None | Partial | Partial |
| Production scalability | Poor | Excellent | Good | Good | Excellent |
| Infrastructure cost | $0 | $20-200/mo | $0 | $0 | $20-200/mo |
| Parquet/S3 support | None | Via extension | Native | Via DuckDB | Via DuckDB |
| Time-series | Poor | Good (Timescale) | Excellent | Good | Excellent |
| AI embeddings | Poor | Excellent (pgvector) | Good | Poor | Excellent |
| Operational complexity | Lowest | Medium | Low | Low | Medium |

**Winner for this use case:** SQLite + DuckDB for development; PostgreSQL + DuckDB for production.

---

## 7. ADR-001: Application State Database

**Context:** The reporting suite needs to persist saved reports, user preferences, AI conversation history, data source configurations, and dashboard layouts. These are OLTP workloads with small row counts and frequent small transactions.

**Decision:** SQLite (via `better-sqlite3` + Drizzle) for local development; PostgreSQL (via `postgres.js` + Drizzle) for production. Selection is environment-driven via `DB_TYPE` environment variable.

**Rationale:** Drizzle provides first-class support for both dialects using compatible schema definitions. SQLite eliminates infrastructure requirements for developers. PostgreSQL provides the write concurrency, JSONB support, and managed hosting options needed for production. The switch between dialects is a single environment variable change.

**Consequences:** Schema must avoid PostgreSQL-specific types (arrays, JSONB as first-class columns) to maintain dev/prod parity. JSONB fields are represented as `text` with JSON serialization in Drizzle, which works in both dialects.

**Alternatives Considered:**
- Turso/libsql for both dev and prod: Rejected because Turso adds network latency and cost for app-state queries that don't benefit from the SQLite wire protocol at scale. A true PostgreSQL instance provides better analytical support when DuckDB is not appropriate.
- Single PostgreSQL for everything: Rejected because it requires Docker or a managed service for local development, which contradicts the existing "zero config" dev philosophy.

---

## 8. ADR-002: Analytical Query Engine

**Context:** Cross-source analytical queries joining CloudWatch metrics, Redshift results, and MySQL exports cannot be served efficiently from the application state database. These queries require columnar execution, window functions, and the ability to read Parquet files or CSV exports from external sources.

**Decision:** DuckDB (via `@duckdb/node-api`) embedded in the Hono backend process as a co-located analytical engine. DuckDB manages its own persistence file (`analytics.duckdb`) separate from the application database.

**Rationale:** DuckDB is the only embeddable OLAP engine with native Node.js bindings, Parquet support, and cross-source federation capabilities (via `sqlite_scanner`, `postgres_scanner`, `httpfs` extensions). It requires zero infrastructure and can JOIN across Parquet files, SQLite tables, and live PostgreSQL connections in a single query. This eliminates the need for a separate data warehouse service (Redshift, BigQuery, Snowflake) until data volumes reach the tens-of-billions-of-rows range.

**Consequences:** DuckDB queries are raw SQL strings — no Drizzle type safety. Query results must be validated with Zod schemas at the service layer. DuckDB's concurrent write model is not suitable for high-frequency writes; the application database handles all OLTP writes. DuckDB in-process competes for memory with the Node.js runtime — memory limits must be configured appropriately.

**Alternatives Considered:**
- PostgreSQL with TimescaleDB for analytics: Viable but requires managing a PostgreSQL extension and loses the zero-infrastructure dev advantage. Would consolidate to one database system but at the cost of dev complexity.
- External data warehouse (Redshift, BigQuery): Correct for petabyte-scale workloads, but introduces significant cost ($300-3000/mo), operational overhead, and latency for the current data volumes.
- sqlite-vec / SQLite analytical extensions: Insufficient for columnar performance; no cross-source federation.

---

## 9. Implementation Roadmap

### Phase 1: Application Database Foundation (Priority: High)
1. Add `better-sqlite3` and `drizzle-orm` to `package.json`
2. Create `src/server/db/schema/app-schema.ts` with the Drizzle schema defined above
3. Create `src/server/db/index.ts` with environment-driven DB selection
4. Create `drizzle.config.ts` for migration management
5. Write and run initial migration
6. Implement CRUD services for: `data_sources`, `saved_queries`, `dashboards`, `user_preferences`

### Phase 2: AI Conversation Persistence (Priority: High)
1. Add CRUD services for `ai_conversations` and `ai_messages`
2. Wire existing AI log analysis routes to persist conversations
3. Add `agent_prompt_templates` management API

### Phase 3: DuckDB Analytical Engine (Priority: Medium)
1. Add `@duckdb/node-api` to `package.json`
2. Create `src/server/db/analytics-db.ts` with the DuckDB module defined above
3. Implement Parquet caching for CloudWatch metric ingestion
4. Create cross-source query execution API (`POST /api/analytics/query`)
5. Add query result cache management (metadata in SQLite, data in Parquet)

### Phase 4: Report Builder API (Priority: Medium)
1. Implement `POST/GET/PUT/DELETE /api/reports` (saved reports CRUD)
2. Implement `POST/GET/PUT/DELETE /api/reports/templates`
3. Implement `POST /api/reports/:id/run` (execute report queries via DuckDB)
4. Implement `GET /api/reports/:id/results` (fetch cached results)

### Phase 5: Production Database Migration (Priority: Low — when needed)
1. Set `DB_TYPE=postgres` and `DATABASE_URL` in production env
2. Run Drizzle migrations against PostgreSQL
3. Configure DuckDB `postgres_scanner` for cross-engine JOINs
4. Migrate Parquet cache to S3 for durability

---

## 10. Package Dependencies to Add

```json
{
  "dependencies": {
    "better-sqlite3": "^9.4.0",
    "drizzle-orm": "^0.38.0",
    "@duckdb/node-api": "^1.1.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "drizzle-kit": "^0.29.0"
  }
}
```

Note: `postgres` (postgres.js) is the preferred PostgreSQL client for Drizzle over `pg` (node-postgres) because it is ESM-native, has a cleaner async API, and Drizzle's PostgreSQL adapter is optimized for it.
