import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

describe("AWS API routes", () => {
  it("GET /api/aws/ec2/instances returns 200 with data array and error field", async () => {
    const res = await app.request("/api/aws/ec2/instances");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("error" in body).toBe(true);
  });

  it("GET /api/aws/s3/buckets returns 200 with data array and error field", async () => {
    const res = await app.request("/api/aws/s3/buckets");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("error" in body).toBe(true);
  });

  it("GET /api/aws/cloudwatch/alarms returns 200 with data array and error field", async () => {
    const res = await app.request("/api/aws/cloudwatch/alarms");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("error" in body).toBe(true);
  });

  it("GET /api/aws/iam/users returns 200 with data array and error field", async () => {
    const res = await app.request("/api/aws/iam/users");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("error" in body).toBe(true);
  });

  it("GET /api/aws/lambda/functions returns 200 with data array and error field", async () => {
    const res = await app.request("/api/aws/lambda/functions");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("error" in body).toBe(true);
  });

  it("GET /api/aws/vpc/list returns 200 with data array and error field", async () => {
    const res = await app.request("/api/aws/vpc/list");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("error" in body).toBe(true);
  });

  it("GET /api/aws/costs/summary returns 200 with data array and error field", async () => {
    const res = await app.request("/api/aws/costs/summary");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect("error" in body).toBe(true);
  });
});
