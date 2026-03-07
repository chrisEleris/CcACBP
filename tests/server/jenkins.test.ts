import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

describe("Jenkins API routes", () => {
  it("GET /api/jenkins/jobs returns 200 with data array", async () => {
    const res = await app.request("/api/jenkins/jobs");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("message" in body).toBe(true);
  });

  it("GET /api/jenkins/jobs/:name returns 200 with data field", async () => {
    const res = await app.request("/api/jenkins/jobs/my-job");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect("data" in body).toBe(true);
    expect("message" in body).toBe(true);
  });

  it("POST /api/jenkins/jobs/:name/build returns 202 with valid body", async () => {
    const res = await app.request("/api/jenkins/jobs/my-job/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parameters: { ENV: "dev" } }),
    });
    const body = await res.json();
    expect(res.status).toBe(202);
    expect("data" in body).toBe(true);
    expect(body.data.jobName).toBe("my-job");
    expect("message" in body).toBe(true);
  });

  it("POST /api/jenkins/jobs/:name/build returns 202 with empty body", async () => {
    const res = await app.request("/api/jenkins/jobs/my-job/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    expect(res.status).toBe(202);
    expect("data" in body).toBe(true);
    expect(body.data.jobName).toBe("my-job");
  });

  it("GET /api/jenkins/builds/:jobName returns 200 with data array", async () => {
    const res = await app.request("/api/jenkins/builds/my-job");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("message" in body).toBe(true);
  });

  it("GET /api/jenkins/deploys returns 200 with data array", async () => {
    const res = await app.request("/api/jenkins/deploys");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("message" in body).toBe(true);
  });

  it("POST /api/jenkins/deploys returns 201 with valid body", async () => {
    const res = await app.request("/api/jenkins/deploys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "my-deploy",
        jenkinsJob: "deploy-job",
        targetEnv: "dev",
        targetService: "my-service",
        awsRegion: "us-east-1",
        deployStrategy: "rolling",
        autoApprove: false,
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect("data" in body).toBe(true);
    expect(body.data.name).toBe("my-deploy");
    expect("message" in body).toBe(true);
  });

  it("POST /api/jenkins/deploys returns 400 with invalid body", async () => {
    const res = await app.request("/api/jenkins/deploys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "my-deploy" }),
    });
    expect(res.status).toBe(400);
  });

  it("PUT /api/jenkins/deploys/:id returns 200 with partial update body", async () => {
    const res = await app.request("/api/jenkins/deploys/deploy-123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "updated-deploy" }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect("data" in body).toBe(true);
    expect(body.data.id).toBe("deploy-123");
    expect(body.data.name).toBe("updated-deploy");
    expect("message" in body).toBe(true);
  });

  it("PUT /api/jenkins/deploys/:id returns 200 with multiple fields", async () => {
    const res = await app.request("/api/jenkins/deploys/deploy-456", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "new-name",
        targetEnv: "staging",
        deployStrategy: "blue-green",
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe("deploy-456");
    expect(body.data.name).toBe("new-name");
    expect(body.data.targetEnv).toBe("staging");
    expect(body.data.deployStrategy).toBe("blue-green");
  });

  it("PUT /api/jenkins/deploys/:id returns 200 with empty body", async () => {
    const res = await app.request("/api/jenkins/deploys/deploy-789", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe("deploy-789");
  });

  it("POST /api/jenkins/deploys/:id/trigger returns 202", async () => {
    const res = await app.request("/api/jenkins/deploys/test-id/trigger", {
      method: "POST",
    });
    const body = await res.json();
    expect(res.status).toBe(202);
    expect("data" in body).toBe(true);
    expect(body.data.deployConfigId).toBe("test-id");
    expect("message" in body).toBe(true);
  });

  it("GET /api/jenkins/server returns 200 with data field", async () => {
    const res = await app.request("/api/jenkins/server");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect("data" in body).toBe(true);
    expect("message" in body).toBe(true);
  });

  it("GET /api/jenkins/queue returns 200 with data array", async () => {
    const res = await app.request("/api/jenkins/queue");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("message" in body).toBe(true);
  });
});
