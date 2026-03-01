import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

describe("AWS API routes", () => {
  it("GET /api/aws/ec2/instances returns placeholder response", async () => {
    const res = await app.request("/api/aws/ec2/instances");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.message).toContain("EC2");
  });

  it("GET /api/aws/s3/buckets returns placeholder response", async () => {
    const res = await app.request("/api/aws/s3/buckets");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.message).toContain("S3");
  });

  it("GET /api/aws/cloudwatch/alarms returns placeholder response", async () => {
    const res = await app.request("/api/aws/cloudwatch/alarms");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("GET /api/aws/iam/users returns placeholder response", async () => {
    const res = await app.request("/api/aws/iam/users");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("GET /api/aws/lambda/functions returns placeholder response", async () => {
    const res = await app.request("/api/aws/lambda/functions");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("GET /api/aws/vpc/list returns placeholder response", async () => {
    const res = await app.request("/api/aws/vpc/list");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("GET /api/aws/costs/summary returns placeholder response", async () => {
    const res = await app.request("/api/aws/costs/summary");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});
