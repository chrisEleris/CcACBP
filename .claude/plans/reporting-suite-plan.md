# Reporting Suite & AI Assistant — Implementation Plan

## Current State

- **Database:** Drizzle ORM selected, SQLite (better-sqlite3) for dev — `src/server/db/` directory exists but is empty
- **No persistence layer** — all data is either mock or fetched live from AWS
- **15 pages** currently in the app (Dashboard, EC2, ECS, S3, CloudWatch, IAM, VPC, Lambda, Costs, Logs, WAF, Jenkins, Deployments, Connectors, Settings)
- **No AI integration** beyond a placeholder `AiLogAnalysis` type

---

## Architecture Decision: Database

### Primary DB: **SQLite via better-sqlite3 + Drizzle ORM**

Already in the tech stack. Handles app state, saved reports, AI conversations, data source configs.

### Analytical Engine: **DuckDB (via duckdb-node)**

DuckDB is purpose-built for analytical queries — columnar storage, vectorized execution, can query CSV/Parquet/JSON directly, and runs in-process (no server). It can also attach to external MySQL and PostgreSQL (Redshift) databases directly.

**Why both:**
- SQLite = transactional app data (users, saved reports, AI conversations, configs)
- DuckDB = analytical queries across ingested data (CloudWatch logs, Redshift exports, MySQL table snapshots, cross-source joins)

### Data Source Connectors

| Source | Connection Method |
|--------|------------------|
| **CloudWatch Logs** | AWS SDK → ingest into DuckDB tables |
| **Redshift** | DuckDB `postgres_scanner` extension (Redshift is Postgres-compatible) |
| **MySQL** | DuckDB `mysql_scanner` extension (direct attach) |
| **S3/CSV/Parquet** | DuckDB native file readers |
| **Cost Explorer** | AWS SDK → ingest into DuckDB |

---

## Schema Design

### SQLite (App State — Drizzle ORM)

```
data_sources          — configured connections (CloudWatch, Redshift, MySQL, etc.)
saved_reports         — report definitions (name, description, query, layout, schedule)
report_executions     — execution history (status, row count, duration, cached result ref)
ai_conversations      — AI chat sessions per page/context
ai_messages           — individual messages in conversations
report_templates      — pre-built report templates
dashboard_configs     — user dashboard layouts and widget configs
query_snippets        — saved reusable query fragments
```

### DuckDB (Analytical — created dynamically)

```
cw_log_events         — ingested CloudWatch log data
cost_daily            — daily cost breakpoints by service
ec2_metrics_hourly    — ingested CloudWatch EC2 metrics
ecs_metrics_hourly    — ingested CloudWatch ECS metrics
[user_tables]         — tables created from Redshift/MySQL imports
[report_cache]        — materialized report results
```

---

## New Pages & AI Integration

### New Pages (6)

| Page | Route | Purpose |
|------|-------|---------|
| **Report Builder** | `/reports` | Create/edit/run reports with visual query builder + SQL editor |
| **Report Viewer** | `/reports/:id` | View a saved report with charts, tables, export |
| **Data Sources** | `/data-sources` | Configure and test connections to CloudWatch, Redshift, MySQL, S3 |
| **AI Assistant** | `/ai` | Dedicated AI workspace for ad-hoc analysis and report generation |
| **Query Explorer** | `/query` | Interactive SQL editor against DuckDB with schema browser |
| **Scheduled Reports** | `/reports/scheduled` | Manage scheduled report runs and delivery |

### AI Assistant on Every Page

Every existing page gets an **AI Assistant panel** (collapsible right-side drawer). The panel includes:

1. **Context-aware AI chat** — knows which page you're on and what data is visible
2. **Quick actions** — pre-built prompts specific to each page:
   - EC2 page: "Analyze instance utilization patterns", "Recommend right-sizing"
   - Cost page: "Explain cost anomalies", "Forecast next month"
   - Logs page: "Find error patterns", "Correlate with deployments"
   - ECS page: "Analyze task failures", "Recommend scaling policy"
3. **Report builder form** — AI generates a report query from natural language
4. **Data source suggestions** — AI recommends which sources to join for the analysis

### AI Agent Architecture

The backend exposes `/api/ai/*` endpoints that:
1. Accept a prompt + page context + selected data
2. Forward to Claude API (or configurable LLM provider)
3. Stream responses back to the UI
4. Can execute generated queries against DuckDB and return results
5. Save conversations for continuity

Agent system prompt templates per page context:
- **Log Analysis Agent** — expert at CloudWatch log pattern detection, error correlation
- **Cost Optimization Agent** — expert at AWS cost analysis, Reserved Instance recommendations
- **Infrastructure Agent** — expert at EC2/ECS sizing, VPC architecture review
- **Security Agent** — expert at IAM policy review, WAF rule optimization
- **Report Builder Agent** — expert at translating natural language to SQL, choosing visualizations
- **General Analytics Agent** — cross-source data analysis, trend detection

---

## Implementation Order (Epics)

### Epic 1: Database Foundation
1. Install better-sqlite3 + drizzle-kit + duckdb
2. Create Drizzle schema for app tables (data_sources, saved_reports, ai_conversations, etc.)
3. Create migration system
4. Add DB initialization to server startup
5. Create DuckDB service (in-process, manages analytical DB)

### Epic 2: Data Source Connectors
1. Data source CRUD API (`/api/data-sources`)
2. Data Sources page (configure, test, manage connections)
3. CloudWatch Logs ingestion service (AWS SDK → DuckDB)
4. Redshift connector via DuckDB postgres_scanner
5. MySQL connector via DuckDB mysql_scanner
6. S3/CSV/Parquet file import
7. Scheduled data sync jobs

### Epic 3: Query & Report Engine
1. Query execution API (`/api/query`) — runs SQL against DuckDB
2. Query Explorer page (SQL editor, schema browser, results grid)
3. Report definition schema (query + visualization config + parameters)
4. Report Builder page (visual builder + SQL mode)
5. Report Viewer page (render charts/tables from saved reports)
6. Report execution and caching
7. Report templates (pre-built for common AWS analyses)

### Epic 4: AI Assistant Integration
1. AI service layer (`/api/ai/*`) — Claude API integration
2. AI conversation persistence (SQLite)
3. Global AI drawer component (context-aware, collapsible)
4. Per-page agent prompt templates and quick actions
5. AI-powered report generation (natural language → SQL → visualization)
6. AI log analysis (replace mock `AiLogAnalysis` with real analysis)
7. Streaming responses (SSE from Hono)

### Epic 5: Scheduled Reports & Delivery
1. Report scheduling CRUD
2. Scheduled Reports page
3. Background job runner for scheduled executions
4. Export formats (CSV, JSON, PDF)

### Epic 6: Enhanced Existing Pages
1. Add AI drawer to all 15 existing pages
2. Add "Create Report from this view" action to each page
3. Add data source indicators (live vs cached vs mock)
4. Update Sidebar with new navigation items

---

## New Dependencies

```
better-sqlite3        — SQLite driver for Node.js
drizzle-orm           — (already selected) ORM
drizzle-kit           — migration tooling
duckdb                — analytical query engine (in-process)
@anthropic-ai/sdk     — Claude API client
@monaco-editor/react  — SQL editor component
react-resizable-panels — split pane for AI drawer
```

---

## Key Technical Decisions

1. **DuckDB runs in-process** — no separate database server needed, same Node.js process
2. **DuckDB attaches to Redshift/MySQL live** — no ETL needed for ad-hoc queries, only ingest for caching
3. **AI conversations are per-page-context** — switching to EC2 page loads EC2-context conversation
4. **Reports are parameterized** — date ranges, filters, etc. stored as Zod schemas
5. **Streaming AI responses** — SSE endpoint for real-time chat experience
6. **GitHub Pages mode** — when deployed static, AI features degrade gracefully (show mock/cached data)
