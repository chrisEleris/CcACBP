import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

describe("Report API routes", () => {
  it("GET /api/reports returns array", async () => {
    const res = await app.request("/api/reports");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /api/reports creates a report", async () => {
    const res = await app.request("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "EC2 Cost Report",
        query: "SELECT * FROM ec2_costs",
        visualization: "bar",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe("EC2 Cost Report");
    expect(body.data.visualization).toBe("bar");
    expect(body.data.id).toBeDefined();
  });

  it("POST /api/reports validates required fields", async () => {
    const res = await app.request("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Missing query" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/reports/:id/execute creates an execution record", async () => {
    // Create a report first
    const createRes = await app.request("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Exec Test Report",
        query: "SELECT 1",
        visualization: "table",
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const execRes = await app.request(`/api/reports/${id}/execute`, {
      method: "POST",
    });
    expect(execRes.status).toBe(200);
    const body = await execRes.json();
    expect(body.data.status).toBe("completed");
    expect(body.data.reportId).toBe(id);
    expect(body.data.rowCount).toBeGreaterThanOrEqual(0);
  });

  it("GET /api/reports/:id/executions returns execution history", async () => {
    // Create and execute a report
    const createRes = await app.request("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "History Test",
        query: "SELECT 1",
        visualization: "table",
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    await app.request(`/api/reports/${id}/execute`, { method: "POST" });

    const historyRes = await app.request(`/api/reports/${id}/executions`);
    expect(historyRes.status).toBe(200);
    const body = await historyRes.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/reports/templates/list returns templates array", async () => {
    const res = await app.request("/api/reports/templates/list");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("DELETE /api/reports/:id removes a report", async () => {
    const createRes = await app.request("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "To Delete",
        query: "SELECT 1",
        visualization: "table",
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const deleteRes = await app.request(`/api/reports/${id}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(200);
  });
});
