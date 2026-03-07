import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

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

  it("GET /api/query/schema returns table schema info", async () => {
    const res = await app.request("/api/query/schema");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].name).toBeDefined();
    expect(body.data[0].columns).toBeDefined();
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
});
