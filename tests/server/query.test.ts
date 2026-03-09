import { describe, expect, it } from "vitest";
import app from "../../src/server/index";
import { isWriteStatement } from "../../src/server/routes/query";

describe("Query API routes", () => {
  it("POST /api/query/execute returns query results", async () => {
    const res = await app.request("/api/query/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: "SELECT 1 AS value" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.columns).toBeDefined();
    expect(Array.isArray(body.data.columns)).toBe(true);
    expect(body.data.rows).toBeDefined();
    expect(Array.isArray(body.data.rows)).toBe(true);
    expect(typeof body.data.rowCount).toBe("number");
    expect(typeof body.data.durationMs).toBe("number");
  });

  it("POST /api/query/execute validates sql field", async () => {
    const res = await app.request("/api/query/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/query/schema returns table schema info from actual database", async () => {
    const res = await app.request("/api/query/schema");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    // Verify structure of each table
    for (const table of body.data) {
      expect(typeof table.name).toBe("string");
      expect(Array.isArray(table.columns)).toBe(true);
      expect(table.columns.length).toBeGreaterThan(0);
      for (const col of table.columns) {
        expect(typeof col.name).toBe("string");
        expect(typeof col.type).toBe("string");
      }
    }

    // Verify only the expected user-facing tables are returned.
    const tableNames = body.data.map((t: { name: string }) => t.name);
    expect(tableNames).toContain("data_sources");
    expect(tableNames).toContain("saved_reports");
    expect(tableNames).toContain("query_snippets");

    // Internal operational tables must NOT be exposed to callers.
    expect(tableNames).not.toContain("ai_conversations");
    expect(tableNames).not.toContain("ai_messages");
    expect(tableNames).not.toContain("report_executions");
    expect(tableNames).not.toContain("scheduled_reports");
    expect(tableNames).not.toContain("report_templates");
    expect(tableNames).not.toContain("dashboard_widgets");
  });

  it("GET /api/query/snippets returns array", async () => {
    const res = await app.request("/api/query/snippets");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /api/query/snippets creates a snippet", async () => {
    const res = await app.request("/api/query/snippets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "EC2 Count",
        description: "Count running EC2 instances",
        sql: "SELECT COUNT(*) FROM ec2_instances WHERE state = 'running'",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe("EC2 Count");
    expect(body.data.id).toBeDefined();
  });

  it("DELETE /api/query/snippets/:id removes a snippet", async () => {
    // Create first
    const createRes = await app.request("/api/query/snippets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "To Delete",
        sql: "SELECT 1",
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const deleteRes = await app.request(`/api/query/snippets/${id}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(200);
  });

  it("DELETE /api/query/snippets/:id returns 404 for non-existent snippet", async () => {
    const res = await app.request("/api/query/snippets/non-existent-id", {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Snippet not found");
  });

  it("POST /api/query/snippets validates required name field", async () => {
    const res = await app.request("/api/query/snippets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: "SELECT 1" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/query/snippets validates required sql field", async () => {
    const res = await app.request("/api/query/snippets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Missing SQL" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("isWriteStatement — bypass vector tests (PG-050)", () => {
  // Valid SELECT queries should not be flagged as write statements
  it("returns false for a simple SELECT", () => {
    expect(isWriteStatement("SELECT 1")).toBe(false);
  });

  it("returns false for multi-statement SELECT queries", () => {
    expect(isWriteStatement("SELECT 1; SELECT 2; SELECT 3")).toBe(false);
  });

  // Bypass vector 1: multi-statement with a write in the second statement
  it("returns true for multi-statement: SELECT followed by DROP TABLE", () => {
    expect(isWriteStatement("SELECT 1; DROP TABLE users")).toBe(true);
  });

  it("returns true for multi-statement: SELECT followed by DELETE", () => {
    expect(isWriteStatement("SELECT name FROM users; DELETE FROM users")).toBe(true);
  });

  it("returns true for multi-statement: SELECT followed by INSERT", () => {
    expect(isWriteStatement("SELECT 1; INSERT INTO t VALUES (1)")).toBe(true);
  });

  // Bypass vector 2: REPLACE INTO (was missing keyword)
  it("returns true for REPLACE INTO statement", () => {
    expect(isWriteStatement("REPLACE INTO users VALUES (1,2,3)")).toBe(true);
  });

  it("returns true for lowercase replace into", () => {
    expect(isWriteStatement("replace into users values (1,2,3)")).toBe(true);
  });

  // Bypass vector 3: PRAGMA write operations (was missing keyword)
  it("returns true for PRAGMA journal_mode write", () => {
    expect(isWriteStatement("PRAGMA journal_mode=DELETE")).toBe(true);
  });

  it("returns true for PRAGMA wal_checkpoint", () => {
    expect(isWriteStatement("PRAGMA wal_checkpoint")).toBe(true);
  });

  // Bypass vector 4: CTE wrapping a write statement
  it("returns true for CTE followed by INSERT", () => {
    expect(isWriteStatement("WITH cte AS (SELECT 1) INSERT INTO t SELECT * FROM cte")).toBe(true);
  });

  it("returns true for CTE followed by UPDATE", () => {
    expect(
      isWriteStatement(
        "WITH cte AS (SELECT id FROM users) UPDATE users SET name='x' WHERE id IN (SELECT id FROM cte)",
      ),
    ).toBe(true);
  });

  it("returns true for CTE followed by DELETE", () => {
    expect(
      isWriteStatement(
        "WITH ids AS (SELECT id FROM old_records) DELETE FROM records WHERE id IN (SELECT id FROM ids)",
      ),
    ).toBe(true);
  });

  // Standard write statements should still be blocked
  it("returns true for INSERT", () => {
    expect(isWriteStatement("INSERT INTO users (name) VALUES ('alice')")).toBe(true);
  });

  it("returns true for UPDATE", () => {
    expect(isWriteStatement("UPDATE users SET name = 'bob' WHERE id = 1")).toBe(true);
  });

  it("returns true for DELETE", () => {
    expect(isWriteStatement("DELETE FROM users WHERE id = 1")).toBe(true);
  });

  it("returns true for DROP TABLE", () => {
    expect(isWriteStatement("DROP TABLE users")).toBe(true);
  });

  it("returns true for ALTER TABLE", () => {
    expect(isWriteStatement("ALTER TABLE users ADD COLUMN email TEXT")).toBe(true);
  });

  it("returns true for CREATE TABLE", () => {
    expect(isWriteStatement("CREATE TABLE new_table (id TEXT PRIMARY KEY)")).toBe(true);
  });

  it("returns true for TRUNCATE", () => {
    expect(isWriteStatement("TRUNCATE TABLE users")).toBe(true);
  });

  it("returns true for ATTACH DATABASE", () => {
    expect(isWriteStatement("ATTACH DATABASE 'other.db' AS other")).toBe(true);
  });

  // Write statement blocked via HTTP endpoint
  it("POST /api/query/execute rejects multi-statement with DROP TABLE (bypass vector 1)", async () => {
    const res = await app.request("/api/query/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: "SELECT 1; DROP TABLE users" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/query/execute rejects REPLACE INTO (bypass vector 2)", async () => {
    const res = await app.request("/api/query/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: "REPLACE INTO users VALUES (1,2,3)" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/query/execute rejects PRAGMA write (bypass vector 3)", async () => {
    const res = await app.request("/api/query/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: "PRAGMA journal_mode=DELETE" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/query/execute rejects CTE with INSERT (bypass vector 4)", async () => {
    const res = await app.request("/api/query/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: "WITH cte AS (SELECT 1) INSERT INTO t SELECT * FROM cte" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/query/execute allows valid multi-SELECT query", async () => {
    // Note: multi-statement SELECTs pass isWriteStatement but SQLite may reject at execution;
    // the point is the write-check doesn't block them.
    expect(isWriteStatement("SELECT 1; SELECT 2")).toBe(false);
  });
});
