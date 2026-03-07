import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

describe("Deployments API routes", () => {
  it("GET /api/deploy/pipelines returns 200 with data array", async () => {
    const res = await app.request("/api/deploy/pipelines");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("message" in body).toBe(true);
  });

  it("GET /api/deploy/pipelines/:id returns 200 with data field", async () => {
    const res = await app.request("/api/deploy/pipelines/test-id");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect("data" in body).toBe(true);
    expect("message" in body).toBe(true);
  });

  it("POST /api/deploy/pipelines returns 202 with valid body", async () => {
    const res = await app.request("/api/deploy/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "my-service",
        version: "1.0.0",
        imageTag: "latest",
        targetEnv: "dev",
        strategy: "rolling",
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(202);
    expect("data" in body).toBe(true);
    expect(body.data.service).toBe("my-service");
    expect(body.data.status).toBe("IN_PROGRESS");
    expect("message" in body).toBe(true);
  });

  it("POST /api/deploy/pipelines returns 400 with invalid body", async () => {
    const res = await app.request("/api/deploy/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: "my-service" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/deploy/pipelines/:id/approve returns 200 with valid body", async () => {
    const res = await app.request("/api/deploy/pipelines/test-id/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approver: "admin" }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect("data" in body).toBe(true);
    expect(body.data.pipelineId).toBe("test-id");
    expect("message" in body).toBe(true);
  });

  it("POST /api/deploy/pipelines/:id/rollback returns 202", async () => {
    const res = await app.request("/api/deploy/pipelines/test-id/rollback", {
      method: "POST",
    });
    const body = await res.json();
    expect(res.status).toBe(202);
    expect("data" in body).toBe(true);
    expect(body.data.pipelineId).toBe("test-id");
    expect("message" in body).toBe(true);
  });

  it("GET /api/deploy/environments returns 200 with data array", async () => {
    const res = await app.request("/api/deploy/environments");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("message" in body).toBe(true);
  });

  it("GET /api/deploy/schedules returns 200 with data array", async () => {
    const res = await app.request("/api/deploy/schedules");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("message" in body).toBe(true);
  });

  it("POST /api/deploy/schedules returns 201 with valid body", async () => {
    const res = await app.request("/api/deploy/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "my-service",
        version: "1.0.0",
        targetEnv: "staging",
        scheduledFor: "2026-04-01T00:00:00Z",
        maintenanceWindow: "00:00-02:00",
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect("data" in body).toBe(true);
    expect(body.data.status).toBe("SCHEDULED");
    expect("message" in body).toBe(true);
  });

  it("DELETE /api/deploy/schedules/:id returns 200 with data field", async () => {
    const res = await app.request("/api/deploy/schedules/test-id", {
      method: "DELETE",
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect("data" in body).toBe(true);
    expect(body.data.id).toBe("test-id");
    expect("message" in body).toBe(true);
  });

  it("GET /api/deploy/rollbacks returns 200 with data array", async () => {
    const res = await app.request("/api/deploy/rollbacks");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("message" in body).toBe(true);
  });
});
