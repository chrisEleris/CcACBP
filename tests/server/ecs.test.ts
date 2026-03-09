import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

describe("ECS API routes", () => {
  it("GET /api/ecs/clusters returns 200 with data array and error field", async () => {
    const res = await app.request("/api/ecs/clusters");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("error" in body).toBe(true);
  });

  it("GET /api/ecs/services/:cluster returns 200 with data array and error field", async () => {
    const res = await app.request("/api/ecs/services/my-cluster");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("error" in body).toBe(true);
  });

  it("GET /api/ecs/tasks/:cluster/:service returns 200 with data array and error field", async () => {
    const res = await app.request("/api/ecs/tasks/my-cluster/my-service");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("error" in body).toBe(true);
  });

  it("POST /api/ecs/services/:cluster/:service/scale returns structured response with valid body", async () => {
    const res = await app.request("/api/ecs/services/my-cluster/my-service/scale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ desiredCount: 2 }),
    });
    const body = await res.json();
    // Returns 202 on success or 500 on AWS credential error — both return structured data
    expect([202, 500]).toContain(res.status);
    expect("data" in body).toBe(true);
    expect("error" in body).toBe(true);
    expect(body.data.cluster).toBe("my-cluster");
    expect(body.data.service).toBe("my-service");
    expect(body.data.desiredCount).toBe(2);
  });

  it("POST /api/ecs/services/:cluster/:service/scale returns 400 with invalid body", async () => {
    const res = await app.request("/api/ecs/services/my-cluster/my-service/scale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ desiredCount: -1 }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/ecs/services/:cluster/:service/deploy returns structured response", async () => {
    const res = await app.request("/api/ecs/services/my-cluster/my-service/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    // Returns 202 on success or 500 on AWS credential error — both return structured data
    expect([202, 500]).toContain(res.status);
    expect("data" in body).toBe(true);
    expect("error" in body).toBe(true);
    expect(body.data.cluster).toBe("my-cluster");
    expect(body.data.service).toBe("my-service");
  });

  it("GET /api/ecs/events/:cluster returns 200 with data array and error field", async () => {
    const res = await app.request("/api/ecs/events/my-cluster");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("error" in body).toBe(true);
  });

  it("GET /api/ecs/clusters/:name returns structured response with data and error fields", async () => {
    const res = await app.request("/api/ecs/clusters/my-cluster");
    const body = await res.json();
    // Returns 200/404 on success or 500 on AWS credential error — all return structured data
    expect([200, 404, 500]).toContain(res.status);
    expect("data" in body).toBe(true);
    expect("error" in body).toBe(true);
  });

  it("POST /api/ecs/tasks/:cluster/:taskId/stop returns structured response with cluster and taskId", async () => {
    const res = await app.request("/api/ecs/tasks/my-cluster/my-task-id/stop", {
      method: "POST",
    });
    const body = await res.json();
    // Returns 202 on success or 500 on AWS credential error — both return structured data
    expect([202, 500]).toContain(res.status);
    expect("data" in body).toBe(true);
    expect("error" in body).toBe(true);
    expect(body.data.cluster).toBe("my-cluster");
    expect(body.data.taskId).toBe("my-task-id");
  });
});

describe("ECS GET endpoints — param validation (PG-055)", () => {
  const INVALID_PARAM = encodeURIComponent("<script>alert(1)</script>");

  it("GET /api/ecs/clusters/:name returns 400 for invalid cluster name", async () => {
    const res = await app.request(`/api/ecs/clusters/${INVALID_PARAM}`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("GET /api/ecs/services/:cluster returns 400 for invalid cluster name", async () => {
    const res = await app.request(`/api/ecs/services/${INVALID_PARAM}`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("GET /api/ecs/tasks/:cluster/:service returns 400 for invalid cluster name", async () => {
    const res = await app.request(`/api/ecs/tasks/${INVALID_PARAM}/valid-service`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("GET /api/ecs/tasks/:cluster/:service returns 400 for invalid service name", async () => {
    const res = await app.request(`/api/ecs/tasks/valid-cluster/${INVALID_PARAM}`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("GET /api/ecs/events/:cluster returns 400 for invalid cluster name", async () => {
    const res = await app.request(`/api/ecs/events/${INVALID_PARAM}`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("GET /api/ecs/clusters/:name allows valid cluster name", async () => {
    const res = await app.request("/api/ecs/clusters/my-valid-cluster");
    // Returns 200/404 on success or 500 on AWS error — all are acceptable for a valid param
    expect([200, 404, 500]).toContain(res.status);
  });

  it("GET /api/ecs/services/:cluster allows valid cluster name", async () => {
    const res = await app.request("/api/ecs/services/my-valid-cluster");
    expect([200, 500]).toContain(res.status);
  });

  it("GET /api/ecs/tasks/:cluster/:service allows valid params", async () => {
    const res = await app.request("/api/ecs/tasks/my-valid-cluster/my-valid-service");
    expect([200, 500]).toContain(res.status);
  });

  it("GET /api/ecs/events/:cluster allows valid cluster name", async () => {
    const res = await app.request("/api/ecs/events/my-valid-cluster");
    expect([200, 500]).toContain(res.status);
  });
});
