import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiKeyAuth } from "../../src/server/middleware/auth";

vi.mock("../../src/server/config", () => ({
  config: {
    API_KEY: "test-secret-key",
  },
}));

import { config } from "../../src/server/config";

/**
 * Build a minimal Hono app that uses the apiKeyAuth middleware and exposes
 * a single route for each HTTP method so we can exercise the middleware
 * without pulling in the full server (which has database dependencies).
 */
function buildApp(): Hono {
  const app = new Hono();

  app.use("/api/*", apiKeyAuth);

  app.get("/api/resource", (c) => c.json({ ok: true }));
  app.post("/api/resource", (c) => c.json({ ok: true }, 201));
  app.put("/api/resource", (c) => c.json({ ok: true }));
  app.delete("/api/resource", (c) => c.json({ ok: true }));
  app.patch("/api/resource", (c) => c.json({ ok: true }));

  return app;
}

describe("apiKeyAuth middleware", () => {
  let app: Hono;

  beforeEach(() => {
    app = buildApp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when API_KEY is configured", () => {
    describe("GET requests (non-mutating)", () => {
      it("passes through without any API key header", async () => {
        const res = await app.request("/api/resource", { method: "GET" });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
      });

      it("passes through even when an incorrect API key is supplied", async () => {
        const res = await app.request("/api/resource", {
          method: "GET",
          headers: { "X-API-Key": "wrong-key" },
        });
        expect(res.status).toBe(200);
      });
    });

    describe("POST requests (mutating)", () => {
      it("returns 401 when no API key is provided", async () => {
        const res = await app.request("/api/resource", { method: "POST" });
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.message).toBe("Unauthorized");
      });

      it("returns 200 with a valid X-API-Key header", async () => {
        const res = await app.request("/api/resource", {
          method: "POST",
          headers: { "X-API-Key": "test-secret-key" },
        });
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.ok).toBe(true);
      });

      it("returns 200 with a valid Authorization: Bearer header", async () => {
        const res = await app.request("/api/resource", {
          method: "POST",
          headers: { Authorization: "Bearer test-secret-key" },
        });
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.ok).toBe(true);
      });

      it("returns 401 when X-API-Key header contains an invalid key", async () => {
        const res = await app.request("/api/resource", {
          method: "POST",
          headers: { "X-API-Key": "bad-key" },
        });
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.message).toBe("Unauthorized");
      });

      it("returns 401 when Authorization header contains an invalid Bearer token", async () => {
        const res = await app.request("/api/resource", {
          method: "POST",
          headers: { Authorization: "Bearer bad-key" },
        });
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.message).toBe("Unauthorized");
      });

      it("returns 401 when Authorization header uses a non-Bearer scheme", async () => {
        const res = await app.request("/api/resource", {
          method: "POST",
          headers: { Authorization: "Basic test-secret-key" },
        });
        expect(res.status).toBe(401);
      });

      it("prefers X-API-Key over Authorization header when both are present", async () => {
        // X-API-Key is valid, Authorization is invalid – should pass
        const resPass = await app.request("/api/resource", {
          method: "POST",
          headers: {
            "X-API-Key": "test-secret-key",
            Authorization: "Bearer bad-key",
          },
        });
        expect(resPass.status).toBe(201);

        // X-API-Key is invalid – should fail regardless of Authorization value
        const resFail = await app.request("/api/resource", {
          method: "POST",
          headers: {
            "X-API-Key": "bad-key",
            Authorization: "Bearer test-secret-key",
          },
        });
        expect(resFail.status).toBe(401);
      });
    });

    describe("PUT requests (mutating)", () => {
      it("returns 401 when no API key is provided", async () => {
        const res = await app.request("/api/resource", { method: "PUT" });
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.message).toBe("Unauthorized");
      });

      it("returns 200 with a valid X-API-Key header", async () => {
        const res = await app.request("/api/resource", {
          method: "PUT",
          headers: { "X-API-Key": "test-secret-key" },
        });
        expect(res.status).toBe(200);
      });
    });

    describe("DELETE requests (mutating)", () => {
      it("returns 401 when no API key is provided", async () => {
        const res = await app.request("/api/resource", { method: "DELETE" });
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.message).toBe("Unauthorized");
      });

      it("returns 200 with a valid X-API-Key header", async () => {
        const res = await app.request("/api/resource", {
          method: "DELETE",
          headers: { "X-API-Key": "test-secret-key" },
        });
        expect(res.status).toBe(200);
      });
    });

    describe("PATCH requests (mutating)", () => {
      it("returns 401 when no API key is provided", async () => {
        const res = await app.request("/api/resource", { method: "PATCH" });
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.message).toBe("Unauthorized");
      });

      it("returns 200 with a valid X-API-Key header", async () => {
        const res = await app.request("/api/resource", {
          method: "PATCH",
          headers: { "X-API-Key": "test-secret-key" },
        });
        expect(res.status).toBe(200);
      });
    });
  });

  describe("when API_KEY is not configured (dev mode)", () => {
    beforeEach(() => {
      // Override the mocked config to simulate no API_KEY set
      vi.mocked(config).API_KEY = undefined;
    });

    it("passes POST through without any credentials", async () => {
      const res = await app.request("/api/resource", { method: "POST" });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it("passes PUT through without any credentials", async () => {
      const res = await app.request("/api/resource", { method: "PUT" });
      expect(res.status).toBe(200);
    });

    it("passes DELETE through without any credentials", async () => {
      const res = await app.request("/api/resource", { method: "DELETE" });
      expect(res.status).toBe(200);
    });

    it("passes PATCH through without any credentials", async () => {
      const res = await app.request("/api/resource", { method: "PATCH" });
      expect(res.status).toBe(200);
    });

    it("passes GET through without any credentials", async () => {
      const res = await app.request("/api/resource", { method: "GET" });
      expect(res.status).toBe(200);
    });
  });
});
