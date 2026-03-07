import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

describe("AI API routes", () => {
  it("GET /api/ai/agents returns agent list", async () => {
    const res = await app.request("/api/ai/agents");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].type).toBeDefined();
    expect(body.data[0].name).toBeDefined();
    expect(body.data[0].description).toBeDefined();
  });

  it("GET /api/ai/conversations returns array", async () => {
    const res = await app.request("/api/ai/conversations");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /api/ai/conversations creates a conversation", async () => {
    const res = await app.request("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "EC2 Analysis",
        pageContext: "ec2",
        agentType: "infrastructure",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.title).toBe("EC2 Analysis");
    expect(body.data.pageContext).toBe("ec2");
    expect(body.data.id).toBeDefined();
  });

  it("POST /api/ai/conversations/:id/messages adds a message", async () => {
    // Create conversation first
    const convRes = await app.request("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Chat Test",
        pageContext: "dashboard",
        agentType: "general",
      }),
    });
    const conv = await convRes.json();
    const convId = conv.data.id;

    const msgRes = await app.request(`/api/ai/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "user",
        content: "What's the current CPU utilization?",
      }),
    });
    expect(msgRes.status).toBe(201);
    const body = await msgRes.json();
    expect(body.data.role).toBe("user");
    expect(body.data.content).toBe("What's the current CPU utilization?");
    expect(body.data.conversationId).toBe(convId);
  });

  it("GET /api/ai/conversations/:id returns conversation with messages", async () => {
    // Create conversation and add message
    const convRes = await app.request("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Fetch Test",
        pageContext: "logs",
        agentType: "log-analysis",
      }),
    });
    const conv = await convRes.json();
    const convId = conv.data.id;

    await app.request(`/api/ai/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user", content: "Hello" }),
    });

    const getRes = await app.request(`/api/ai/conversations/${convId}`);
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.data.conversation.id).toBe(convId);
    expect(Array.isArray(body.data.messages)).toBe(true);
    expect(body.data.messages.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/ai/analyze returns mock analysis", async () => {
    const res = await app.request("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Analyze CPU usage patterns",
        pageContext: "ec2",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.response).toBeDefined();
    expect(typeof body.data.response).toBe("string");
    expect(body.data.agentType).toBeDefined();
  });

  it("DELETE /api/ai/conversations/:id removes a conversation", async () => {
    const convRes = await app.request("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "To Delete",
        pageContext: "dashboard",
        agentType: "general",
      }),
    });
    const conv = await convRes.json();
    const convId = conv.data.id;

    const deleteRes = await app.request(`/api/ai/conversations/${convId}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(200);
  });
});
