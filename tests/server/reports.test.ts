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

  it("GET /api/reports/:id returns a report when found", async () => {
    const createRes = await app.request("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Fetch Me",
        query: "SELECT 1",
        visualization: "table",
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const getRes = await app.request(`/api/reports/${id}`);
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.data.id).toBe(id);
    expect(body.data.name).toBe("Fetch Me");
  });

  it("GET /api/reports/:id returns 404 when report does not exist", async () => {
    const res = await app.request("/api/reports/nonexistent-id-that-does-not-exist");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Report not found");
  });

  it("PUT /api/reports/:id updates an existing report", async () => {
    const createRes = await app.request("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Original Name",
        query: "SELECT 1",
        visualization: "table",
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const updateRes = await app.request(`/api/reports/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Name", visualization: "bar" }),
    });
    expect(updateRes.status).toBe(200);
    const body = await updateRes.json();
    expect(body.data.id).toBe(id);
    expect(body.data.name).toBe("Updated Name");
    expect(body.data.visualization).toBe("bar");
  });

  it("PUT /api/reports/:id returns 404 when report does not exist", async () => {
    const res = await app.request("/api/reports/nonexistent-id-that-does-not-exist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ghost Update" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Report not found");
  });

  it("POST /api/reports/:id/execute returns 404 when report does not exist", async () => {
    const res = await app.request("/api/reports/nonexistent-id-that-does-not-exist/execute", {
      method: "POST",
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Report not found");
  });

  it("GET /api/reports/:id/executions returns 404 when report does not exist", async () => {
    const res = await app.request("/api/reports/nonexistent-id-that-does-not-exist/executions");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Report not found");
  });

  it("DELETE /api/reports/:id returns 404 when report does not exist", async () => {
    const res = await app.request("/api/reports/nonexistent-id-that-does-not-exist", {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Report not found");
  });

  it("DELETE /api/reports/:id cascades deletion to related executions", async () => {
    // Create a report
    const createRes = await app.request("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Cascade Delete Test",
        query: "SELECT 1",
        visualization: "table",
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    // Execute the report to create execution records
    await app.request(`/api/reports/${id}/execute`, { method: "POST" });
    await app.request(`/api/reports/${id}/execute`, { method: "POST" });

    // Verify executions exist
    const execRes = await app.request(`/api/reports/${id}/executions`);
    const execBody = await execRes.json();
    expect(execBody.data.length).toBeGreaterThanOrEqual(2);

    // Delete the report (should cascade to executions)
    const deleteRes = await app.request(`/api/reports/${id}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(200);

    // Report should be gone
    const getRes = await app.request(`/api/reports/${id}`);
    expect(getRes.status).toBe(404);
  });
});
