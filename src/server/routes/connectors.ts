import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

const connectSchema = z.object({
  connectorId: z.enum(["aws-mcp", "slack", "claude-ai", "chatgpt"]),
  config: z.record(z.string()),
});

const testSchema = z.object({
  connectorId: z.enum(["aws-mcp", "slack", "claude-ai", "chatgpt"]),
});

export const connectorRoutes = new Hono()
  .get("/", (c) => {
    return c.json({
      data: [
        { id: "aws-mcp", name: "AWS MCP Server", status: "disconnected" },
        { id: "slack", name: "Slack", status: "disconnected" },
        { id: "claude-ai", name: "Claude AI", status: "disconnected" },
        { id: "chatgpt", name: "ChatGPT", status: "disconnected" },
      ],
    });
  })
  .post("/connect", zValidator("json", connectSchema), (c) => {
    const { connectorId } = c.req.valid("json");
    return c.json({
      success: true,
      message: `Connector ${connectorId} configuration saved. Integration pending implementation.`,
    });
  })
  .post("/test", zValidator("json", testSchema), (c) => {
    const { connectorId } = c.req.valid("json");
    return c.json({
      success: false,
      message: `Test for ${connectorId}: not yet configured. Add credentials first.`,
    });
  });
