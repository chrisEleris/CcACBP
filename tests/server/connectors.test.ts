import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

describe("Connector API routes", () => {
  it("GET /api/connectors returns all connectors", async () => {
    const res = await app.request("/api/connectors");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.connectors).toHaveLength(4);
    expect(body.connectors[0].id).toBe("aws-mcp");
    expect(body.connectors[1].id).toBe("slack");
    expect(body.connectors[2].id).toBe("claude-ai");
    expect(body.connectors[3].id).toBe("chatgpt");
  });

  it("POST /api/connectors/connect saves config", async () => {
    const res = await app.request("/api/connectors/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connectorId: "slack",
        config: { webhookUrl: "https://hooks.slack.com/test" },
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain("slack");
  });

  it("POST /api/connectors/connect validates connector ID", async () => {
    const res = await app.request("/api/connectors/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connectorId: "invalid-connector",
        config: {},
      }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/connectors/test returns not configured", async () => {
    const res = await app.request("/api/connectors/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectorId: "aws-mcp" }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.message).toContain("aws-mcp");
  });
});
