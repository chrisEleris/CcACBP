import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

describe("Data Source API routes", () => {
  it("GET /api/data-sources returns empty array initially", async () => {
    const res = await app.request("/api/data-sources");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /api/data-sources creates a data source", async () => {
    const res = await app.request("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test CloudWatch",
        type: "cloudwatch",
        config: JSON.stringify({ region: "us-east-1", logGroup: "/aws/lambda/test" }),
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe("Test CloudWatch");
    expect(body.data.type).toBe("cloudwatch");
    expect(body.data.status).toBe("disconnected");
    expect(body.data.id).toBeDefined();
  });

  it("POST /api/data-sources validates required fields", async () => {
    const res = await app.request("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Missing type" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/data-sources rejects invalid type enum value", async () => {
    const res = await app.request("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bad Type",
        type: "postgresql",
        config: JSON.stringify({ host: "localhost" }),
      }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/data-sources rejects empty name", async () => {
    const res = await app.request("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        type: "mysql",
        config: JSON.stringify({ host: "localhost" }),
      }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/data-sources/:id/test updates connection status", async () => {
    // Create a source first
    const createRes = await app.request("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test MySQL",
        type: "mysql",
        config: JSON.stringify({ host: "localhost", port: 3306 }),
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const testRes = await app.request(`/api/data-sources/${id}/test`, {
      method: "POST",
    });
    expect(testRes.status).toBe(200);
    const body = await testRes.json();
    expect(body.data.status).toBe("connected");
    expect(body.data.lastTestedAt).toBeDefined();
  });

  it("DELETE /api/data-sources/:id removes a data source", async () => {
    // Create a source first
    const createRes = await app.request("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "To Delete",
        type: "s3",
        config: JSON.stringify({ bucket: "test-bucket" }),
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const deleteRes = await app.request(`/api/data-sources/${id}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(200);

    // Verify it's gone
    const getRes = await app.request(`/api/data-sources/${id}`);
    expect(getRes.status).toBe(404);
  });

  it("GET /api/data-sources/:id returns an existing data source", async () => {
    const createRes = await app.request("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Get By ID Source",
        type: "redshift",
        config: JSON.stringify({ host: "redshift.example.com", port: 5439 }),
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const getRes = await app.request(`/api/data-sources/${id}`);
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.data.id).toBe(id);
    expect(body.data.name).toBe("Get By ID Source");
    expect(body.data.type).toBe("redshift");
  });

  it("PUT /api/data-sources/:id updates an existing data source", async () => {
    const createRes = await app.request("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Original Name",
        type: "csv",
        config: JSON.stringify({ path: "/data/file.csv" }),
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const updateRes = await app.request(`/api/data-sources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Name" }),
    });
    expect(updateRes.status).toBe(200);
    const body = await updateRes.json();
    expect(body.data.id).toBe(id);
    expect(body.data.name).toBe("Updated Name");
    expect(body.data.type).toBe("csv");
  });

  it("PUT /api/data-sources/:id returns 404 for non-existent data source", async () => {
    const res = await app.request("/api/data-sources/non-existent-id", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ghost Update" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Data source not found");
  });

  it("POST /api/data-sources/:id/test returns 404 for non-existent data source", async () => {
    const res = await app.request("/api/data-sources/non-existent-id/test", {
      method: "POST",
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Data source not found");
  });

  it("DELETE /api/data-sources/:id returns 404 for non-existent data source", async () => {
    const res = await app.request("/api/data-sources/non-existent-id", {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Data source not found");
  });

  it("GET /api/data-sources redacts sensitive config fields", async () => {
    // Create a data source with sensitive fields in config
    await app.request("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Redaction Test",
        type: "mysql",
        config: JSON.stringify({
          host: "db.example.com",
          port: 3306,
          password: "super-secret-pass",
          apiKey: "sk-12345",
        }),
      }),
    });

    const res = await app.request("/api/data-sources");
    const body = await res.json();
    const found = body.data.find((ds: { name: string }) => ds.name === "Redaction Test");
    expect(found).toBeDefined();

    const config = JSON.parse(found.config);
    // Non-sensitive fields should be preserved
    expect(config.host).toBe("db.example.com");
    expect(config.port).toBe(3306);
    // Sensitive fields should be redacted
    expect(config.password).toBe("***REDACTED***");
    expect(config.apiKey).toBe("***REDACTED***");
  });

  it("POST /api/data-sources redacts sensitive config fields in create response", async () => {
    const res = await app.request("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Create Redaction Test",
        type: "mysql",
        config: JSON.stringify({
          host: "db.example.com",
          password: "my-secret-pass",
          accessKey: "AKIA12345",
        }),
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    const config = JSON.parse(body.data.config);
    expect(config.host).toBe("db.example.com");
    expect(config.password).toBe("***REDACTED***");
    expect(config.accessKey).toBe("***REDACTED***");
  });

  it("PUT /api/data-sources/:id redacts sensitive config fields in update response", async () => {
    const createRes = await app.request("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Update Redaction Test",
        type: "s3",
        config: JSON.stringify({ bucket: "test" }),
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const updateRes = await app.request(`/api/data-sources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: JSON.stringify({
          bucket: "updated-bucket",
          secretKey: "super-secret",
        }),
      }),
    });
    expect(updateRes.status).toBe(200);
    const body = await updateRes.json();
    const config = JSON.parse(body.data.config);
    expect(config.bucket).toBe("updated-bucket");
    expect(config.secretKey).toBe("***REDACTED***");
  });

  it("POST /api/data-sources/:id/test redacts sensitive config fields in response", async () => {
    const createRes = await app.request("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Redaction Test",
        type: "mysql",
        config: JSON.stringify({
          host: "db.example.com",
          credentials: "secret-creds",
        }),
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const testRes = await app.request(`/api/data-sources/${id}/test`, {
      method: "POST",
    });
    expect(testRes.status).toBe(200);
    const body = await testRes.json();
    const config = JSON.parse(body.data.config);
    expect(config.host).toBe("db.example.com");
    expect(config.credentials).toBe("***REDACTED***");
  });

  it("GET /api/data-sources/:id redacts sensitive config fields", async () => {
    const createRes = await app.request("/api/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Single Redaction Test",
        type: "redshift",
        config: JSON.stringify({
          host: "redshift.example.com",
          secret: "top-secret",
          token: "bearer-token-123",
        }),
      }),
    });
    const created = await createRes.json();
    const id = created.data.id;

    const getRes = await app.request(`/api/data-sources/${id}`);
    const body = await getRes.json();
    const config = JSON.parse(body.data.config);
    expect(config.host).toBe("redshift.example.com");
    expect(config.secret).toBe("***REDACTED***");
    expect(config.token).toBe("***REDACTED***");
  });
});
