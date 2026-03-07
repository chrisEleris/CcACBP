import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

describe("Scheduled Reports API routes", () => {
  it("GET /api/scheduled-reports returns array", async () => {
    const res = await app.request("/api/scheduled-reports");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /api/scheduled-reports creates a schedule", async () => {
    // Create a report first
    const reportRes = await app.request("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Scheduled Test Report",
        query: "SELECT 1",
        visualization: "table",
      }),
    });
    const report = await reportRes.json();
    const reportId = report.data.id;

    const res = await app.request("/api/scheduled-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId,
        cronExpression: "0 9 * * *",
        format: "csv",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.reportId).toBe(reportId);
    expect(body.data.cronExpression).toBe("0 9 * * *");
    expect(body.data.enabled).toBe(true);
    expect(body.data.id).toBeDefined();
  });

  it("POST /api/scheduled-reports validates required fields", async () => {
    const res = await app.request("/api/scheduled-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cronExpression: "0 9 * * *" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/scheduled-reports/:id/run triggers execution", async () => {
    // Create report and schedule
    const reportRes = await app.request("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Run Test",
        query: "SELECT 1",
        visualization: "table",
      }),
    });
    const report = await reportRes.json();

    const schedRes = await app.request("/api/scheduled-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: report.data.id,
        cronExpression: "0 * * * *",
        format: "json",
      }),
    });
    const sched = await schedRes.json();

    const runRes = await app.request(`/api/scheduled-reports/${sched.data.id}/run`, {
      method: "POST",
    });
    expect(runRes.status).toBe(200);
    const body = await runRes.json();
    expect(body.data.status).toBe("completed");
  });

  it("DELETE /api/scheduled-reports/:id removes a schedule", async () => {
    const reportRes = await app.request("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Delete Sched Test",
        query: "SELECT 1",
        visualization: "table",
      }),
    });
    const report = await reportRes.json();

    const schedRes = await app.request("/api/scheduled-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: report.data.id,
        cronExpression: "0 0 * * *",
        format: "json",
      }),
    });
    const sched = await schedRes.json();

    const deleteRes = await app.request(`/api/scheduled-reports/${sched.data.id}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(200);
  });
});
