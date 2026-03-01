import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

describe("Health endpoint", () => {
  it("should return ok status", async () => {
    const res = await app.request("/api/health");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });
});
