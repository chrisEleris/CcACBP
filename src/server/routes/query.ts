import { zValidator } from "@hono/zod-validator";
import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index";
import { querySnippets } from "../db/schema";
import { parsePagination } from "../lib/pagination";

const MAX_SQL = 50_000;
const MAX_NAME = 500;

// Defense-in-depth: block write statements at the application layer even if
// the underlying connection were somehow not read-only.

/**
 * Pattern that matches a single SQL statement starting with a write keyword
 * (after stripping leading whitespace and line/block comments).
 */
const WRITE_STATEMENT_PATTERN =
  /^\s*(?:--[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|ATTACH|DETACH|REPLACE|PRAGMA)\b/i;

/**
 * Pattern that detects a CTE (WITH clause) followed by a write operation.
 * Covers: WITH ... INSERT, WITH ... UPDATE, WITH ... DELETE
 */
const CTE_WRITE_PATTERN = /\b(?:INSERT|UPDATE|DELETE)\b/i;

/**
 * Splits a SQL string into individual statements on `;` boundaries while
 * being aware of quoted string literals (single-quotes, double-quotes, backticks).
 *
 * Semicolons that appear inside a quoted string are not treated as statement
 * terminators.  Doubled quotes (e.g. `it''s`) are handled as the standard
 * SQL escape sequence for a literal quote character inside a string.
 *
 * @param sqlStr - The raw SQL input that may contain one or more statements.
 * @returns An array of trimmed, non-empty statement strings.
 */
export function splitStatements(sqlStr: string): string[] {
  const stmts: string[] = [];
  let current = "";
  let inString = false;
  let stringChar = "";
  for (let i = 0; i < sqlStr.length; i++) {
    const ch = sqlStr[i];
    if (inString) {
      current += ch;
      if (ch === stringChar) {
        if (sqlStr[i + 1] === stringChar) {
          // Doubled quote is an escape sequence — consume both characters.
          current += sqlStr[++i];
        } else {
          inString = false;
        }
      }
    } else if (ch === "'" || ch === '"' || ch === "`") {
      inString = true;
      stringChar = ch;
      current += ch;
    } else if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed) stmts.push(trimmed);
      current = "";
    } else {
      current += ch;
    }
  }
  const trimmed = current.trim();
  if (trimmed) stmts.push(trimmed);
  return stmts;
}

/**
 * Returns true when the SQL input contains any write statement keyword.
 *
 * Handles the following bypass vectors:
 * - Multi-statement queries (split on `;`, each statement checked individually,
 *   using a string-aware splitter so semicolons in literals are not misread)
 * - REPLACE INTO (added to the block-list)
 * - PRAGMA write operations (added to the block-list)
 * - CTEs: WITH ... (INSERT|UPDATE|DELETE) patterns are detected by scanning
 *   the full statement for write keywords after a WITH clause
 */
export function isWriteStatement(sqlStr: string): boolean {
  const statements = splitStatements(sqlStr);

  for (const stmt of statements) {
    // Check if this statement starts with a write keyword.
    if (WRITE_STATEMENT_PATTERN.test(stmt)) {
      return true;
    }

    // Check for CTE-wrapped write statements: WITH ... (INSERT|UPDATE|DELETE)
    if (
      /^\s*(?:--[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*WITH\b/i.test(stmt) &&
      CTE_WRITE_PATTERN.test(stmt)
    ) {
      return true;
    }
  }

  return false;
}

const executeQuerySchema = z.object({
  sql: z.string().min(1).max(MAX_SQL),
  dataSourceId: z.string().max(200).optional(),
});

const createSnippetSchema = z.object({
  name: z.string().min(1).max(MAX_NAME),
  description: z.string().max(MAX_NAME).optional(),
  sql: z.string().min(1).max(MAX_SQL),
  dataSourceId: z.string().max(200).optional(),
});

type SchemaColumn = {
  name: string;
  type: string;
};

type SchemaTable = {
  name: string;
  columns: SchemaColumn[];
};

/**
 * Tables exposed via GET /api/query/schema.
 *
 * Only user-facing tables are included. Internal operational tables
 * (ai_conversations, ai_messages, report_executions, dashboard_widgets,
 * report_templates, scheduled_reports) are intentionally excluded to
 * limit schema information disclosure to API callers.
 */
const SCHEMA_ALLOWED_TABLES = new Set(["data_sources", "saved_reports", "query_snippets"]);

/**
 * Queries the actual SQLite database schema and returns only the allowed tables.
 * Reads sqlite_master for table names and PRAGMA table_info for column details.
 */
async function getDbSchema(): Promise<SchemaTable[]> {
  const tablesResult = await db.all<{ name: string }>(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name`,
  );

  const tables: SchemaTable[] = [];
  for (const table of tablesResult) {
    // Only expose tables in the allow-list to avoid leaking internal application schema.
    if (!SCHEMA_ALLOWED_TABLES.has(table.name)) continue;

    const columnsResult = await db.all<{ name: string; type: string }>(
      sql`SELECT name, type FROM pragma_table_info(${table.name})`,
    );
    tables.push({
      name: table.name,
      columns: columnsResult.map((col) => ({
        name: col.name,
        type: col.type || "TEXT",
      })),
    });
  }

  return tables;
}

export const queryRoutes = new Hono()
  .post("/execute", zValidator("json", executeQuerySchema), async (c) => {
    try {
      const { sql: sqlStr } = c.req.valid("json");

      // Defense-in-depth: reject write statements before execution even if the
      // underlying connection is already restricted to read-only mode.
      if (isWriteStatement(sqlStr)) {
        return c.json(
          {
            message:
              "Write statements (INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, ATTACH, DETACH, REPLACE, PRAGMA) are not permitted. Only SELECT queries are allowed.",
          },
          400,
        );
      }

      // Stub: returns mock data. When implementing real execution:
      // - Enforce read-only connections (no INSERT/UPDATE/DELETE/DROP/ALTER)
      // - Apply query timeout limits
      // - Use parameterized queries only
      // - Add per-user rate limiting
      return c.json({
        data: {
          columns: ["id", "name", "value"],
          rows: [
            { id: "1", name: "sample-row-1", value: "100" },
            { id: "2", name: "sample-row-2", value: "200" },
            { id: "3", name: "sample-row-3", value: "300" },
          ],
          rowCount: 3,
          durationMs: 42,
          mock: true,
        },
      });
    } catch (error) {
      console.error("Error executing query:", error);
      return c.json({ message: "Failed to execute query" }, 500);
    }
  })

  .get("/snippets", async (c) => {
    try {
      const pagination = parsePagination(c);
      const snippets = await db
        .select()
        .from(querySnippets)
        .orderBy(desc(querySnippets.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset);
      const countRow = await db.get<{ count: number }>(
        sql`select count(*) as count from query_snippets`,
      );
      const total = countRow?.count ?? 0;
      return c.json({
        data: snippets,
        pagination: { limit: pagination.limit, offset: pagination.offset, total },
      });
    } catch (error) {
      console.error("Error listing query snippets:", error);
      return c.json({ message: "Failed to list snippets" }, 500);
    }
  })

  .post("/snippets", zValidator("json", createSnippetSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const now = new Date().toISOString();
      const [created] = await db
        .insert(querySnippets)
        .values({
          id: crypto.randomUUID(),
          name: data.name,
          description: data.description ?? "",
          sql: data.sql,
          dataSourceId: data.dataSourceId ?? null,
          createdAt: now,
        })
        .returning();
      return c.json({ data: created }, 201);
    } catch (error) {
      console.error("Error saving query snippet:", error);
      return c.json({ message: "Failed to save snippet" }, 500);
    }
  })

  .delete("/snippets/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const [existing] = await db.select().from(querySnippets).where(eq(querySnippets.id, id));
      if (!existing) {
        return c.json({ message: "Snippet not found" }, 404);
      }
      await db.delete(querySnippets).where(eq(querySnippets.id, id));
      return c.json({ data: { message: "Snippet deleted" } });
    } catch (error) {
      console.error("Error deleting query snippet:", error);
      return c.json({ message: "Failed to delete snippet" }, 500);
    }
  })

  .get("/schema", async (c) => {
    try {
      const schema = await getDbSchema();
      return c.json({ data: schema });
    } catch (error) {
      console.error("Error fetching database schema:", error);
      return c.json({ message: "Failed to fetch schema" }, 500);
    }
  });
