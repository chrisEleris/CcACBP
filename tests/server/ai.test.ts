import { describe, expect, it } from "vitest";
import app from "../../src/server/index";

type ConversationBody = {
  data: {
    id: string;
    title: string;
    pageContext: string;
    agentType: string;
    createdAt: string;
    updatedAt: string;
  };
};

type MessageBody = {
  data: {
    id: string;
    conversationId: string;
    role: string;
    content: string;
    metadata: string;
    createdAt: string;
  };
};

type ConversationDetailBody = {
  data: {
    conversation: ConversationBody["data"];
    messages: MessageBody["data"][];
  };
};

type AgentInfo = {
  type: string;
  name: string;
  description: string;
};

type AgentsBody = {
  data: AgentInfo[];
};

type ConversationsListBody = {
  data: ConversationBody["data"][];
};

type AnalyzeBody = {
  data: {
    response: string;
    agentType: string;
  };
};

type ErrorBody = {
  message: string;
};

async function createConversation(
  title: string,
  pageContext: string,
  agentType?: string,
): Promise<ConversationBody["data"]> {
  const res = await app.request("/api/ai/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, pageContext, agentType }),
  });
  const body = (await res.json()) as ConversationBody;
  return body.data;
}

describe("AI API routes", () => {
  describe("GET /api/ai/agents", () => {
    it("returns a non-empty array of agents", async () => {
      const res = await app.request("/api/ai/agents");
      expect(res.status).toBe(200);
      const body = (await res.json()) as AgentsBody;
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it("each agent has type, name, and description fields", async () => {
      const res = await app.request("/api/ai/agents");
      const body = (await res.json()) as AgentsBody;
      for (const agent of body.data) {
        expect(typeof agent.type).toBe("string");
        expect(agent.type.length).toBeGreaterThan(0);
        expect(typeof agent.name).toBe("string");
        expect(agent.name.length).toBeGreaterThan(0);
        expect(typeof agent.description).toBe("string");
        expect(agent.description.length).toBeGreaterThan(0);
      }
    });

    it("returns all six expected agent types", async () => {
      const res = await app.request("/api/ai/agents");
      const body = (await res.json()) as AgentsBody;
      const types = body.data.map((a) => a.type);
      expect(types).toContain("log-analysis");
      expect(types).toContain("cost-optimization");
      expect(types).toContain("infrastructure");
      expect(types).toContain("security");
      expect(types).toContain("report-builder");
      expect(types).toContain("general");
    });
  });

  describe("GET /api/ai/conversations", () => {
    it("returns an array", async () => {
      const res = await app.request("/api/ai/conversations");
      expect(res.status).toBe(200);
      const body = (await res.json()) as ConversationsListBody;
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("returns conversations that were previously created", async () => {
      await createConversation("List Test Conv", "ec2");
      const res = await app.request("/api/ai/conversations");
      expect(res.status).toBe(200);
      const body = (await res.json()) as ConversationsListBody;
      const titles = body.data.map((c) => c.title);
      expect(titles).toContain("List Test Conv");
    });

    it("filters conversations by pageContext query param", async () => {
      await createConversation("EC2 Conv", "ec2-filter-test");
      await createConversation("Logs Conv", "logs-filter-test");

      const res = await app.request("/api/ai/conversations?pageContext=ec2-filter-test");
      expect(res.status).toBe(200);
      const body = (await res.json()) as ConversationsListBody;
      expect(Array.isArray(body.data)).toBe(true);
      for (const conv of body.data) {
        expect(conv.pageContext).toBe("ec2-filter-test");
      }
    });

    it("returns empty array when filtering by a pageContext with no matches", async () => {
      const res = await app.request("/api/ai/conversations?pageContext=nonexistent-context-xyz");
      expect(res.status).toBe(200);
      const body = (await res.json()) as ConversationsListBody;
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(0);
    });
  });

  describe("POST /api/ai/conversations", () => {
    it("creates a conversation with all fields provided", async () => {
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
      const body = (await res.json()) as ConversationBody;
      expect(body.data.title).toBe("EC2 Analysis");
      expect(body.data.pageContext).toBe("ec2");
      expect(body.data.agentType).toBe("infrastructure");
      expect(typeof body.data.id).toBe("string");
      expect(body.data.id.length).toBeGreaterThan(0);
    });

    it("defaults agentType to general when omitted", async () => {
      const res = await app.request("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "No Agent", pageContext: "dashboard" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as ConversationBody;
      expect(body.data.agentType).toBe("general");
    });

    it("returns 400 when title is missing", async () => {
      const res = await app.request("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageContext: "ec2" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when pageContext is missing", async () => {
      const res = await app.request("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "No Context" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when title is an empty string", async () => {
      const res = await app.request("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", pageContext: "ec2" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when pageContext is an empty string", async () => {
      const res = await app.request("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Title", pageContext: "" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when agentType is not a valid enum value", async () => {
      const res = await app.request("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Bad Agent",
          pageContext: "ec2",
          agentType: "invalid-agent",
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when request body is empty", async () => {
      const res = await app.request("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it("assigns a unique id to each created conversation", async () => {
      const conv1 = await createConversation("Unique Check 1", "dashboard");
      const conv2 = await createConversation("Unique Check 2", "dashboard");
      expect(conv1.id).not.toBe(conv2.id);
    });

    it("created conversation includes createdAt and updatedAt timestamps", async () => {
      const res = await app.request("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Timestamp Test", pageContext: "logs" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as ConversationBody;
      expect(typeof body.data.createdAt).toBe("string");
      expect(body.data.createdAt.length).toBeGreaterThan(0);
      expect(typeof body.data.updatedAt).toBe("string");
      expect(body.data.updatedAt.length).toBeGreaterThan(0);
    });

    it("accepts all valid agentType enum values", async () => {
      const validTypes = [
        "log-analysis",
        "cost-optimization",
        "infrastructure",
        "security",
        "report-builder",
        "general",
      ] as const;

      for (const agentType of validTypes) {
        const res = await app.request("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: `Test ${agentType}`, pageContext: "test", agentType }),
        });
        expect(res.status).toBe(201);
        const body = (await res.json()) as ConversationBody;
        expect(body.data.agentType).toBe(agentType);
      }
    });
  });

  describe("GET /api/ai/conversations/:id", () => {
    it("returns conversation with messages array", async () => {
      const conv = await createConversation("Fetch Test", "logs", "log-analysis");

      await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: "Hello" }),
      });

      const res = await app.request(`/api/ai/conversations/${conv.id}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as ConversationDetailBody;
      expect(body.data.conversation.id).toBe(conv.id);
      expect(body.data.conversation.title).toBe("Fetch Test");
      expect(Array.isArray(body.data.messages)).toBe(true);
      expect(body.data.messages.length).toBeGreaterThanOrEqual(1);
    });

    it("returns empty messages array when no messages have been added", async () => {
      const conv = await createConversation("Empty Messages Conv", "dashboard");

      const res = await app.request(`/api/ai/conversations/${conv.id}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as ConversationDetailBody;
      expect(Array.isArray(body.data.messages)).toBe(true);
      expect(body.data.messages.length).toBe(0);
    });

    it("returns 404 for a non-existent conversation id", async () => {
      const res = await app.request("/api/ai/conversations/non-existent-id-00000");
      expect(res.status).toBe(404);
      const body = (await res.json()) as ErrorBody;
      expect(typeof body.message).toBe("string");
    });

    it("returns messages in the order they were added", async () => {
      const conv = await createConversation("Message Order Test", "ec2");

      await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: "First message" }),
      });
      await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "assistant", content: "Second message" }),
      });

      const res = await app.request(`/api/ai/conversations/${conv.id}`);
      const body = (await res.json()) as ConversationDetailBody;
      expect(body.data.messages[0].content).toBe("First message");
      expect(body.data.messages[1].content).toBe("Second message");
    });
  });

  describe("DELETE /api/ai/conversations/:id", () => {
    it("removes a conversation and returns 200", async () => {
      const conv = await createConversation("To Delete", "dashboard", "general");

      const deleteRes = await app.request(`/api/ai/conversations/${conv.id}`, {
        method: "DELETE",
      });
      expect(deleteRes.status).toBe(200);
    });

    it("deleted conversation is no longer retrievable", async () => {
      const conv = await createConversation("Delete Verify", "ec2");

      await app.request(`/api/ai/conversations/${conv.id}`, { method: "DELETE" });

      const getRes = await app.request(`/api/ai/conversations/${conv.id}`);
      expect(getRes.status).toBe(404);
    });

    it("returns 404 when deleting a non-existent conversation", async () => {
      const res = await app.request("/api/ai/conversations/does-not-exist-xyz", {
        method: "DELETE",
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ErrorBody;
      expect(typeof body.message).toBe("string");
    });

    it("also removes all messages belonging to the deleted conversation", async () => {
      const conv = await createConversation("Delete With Messages", "logs");

      await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: "Message that should be deleted" }),
      });

      await app.request(`/api/ai/conversations/${conv.id}`, { method: "DELETE" });

      const getRes = await app.request(`/api/ai/conversations/${conv.id}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe("POST /api/ai/conversations/:id/messages", () => {
    it("adds a user message to an existing conversation", async () => {
      const conv = await createConversation("Chat Test", "dashboard", "general");

      const res = await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: "What is the CPU utilization?" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as MessageBody;
      expect(body.data.role).toBe("user");
      expect(body.data.content).toBe("What is the CPU utilization?");
      expect(body.data.conversationId).toBe(conv.id);
    });

    it("adds an assistant message to an existing conversation", async () => {
      const conv = await createConversation("Assistant Msg Test", "ec2");

      const res = await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "assistant", content: "CPU utilization is at 45%." }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as MessageBody;
      expect(body.data.role).toBe("assistant");
      expect(body.data.content).toBe("CPU utilization is at 45%.");
      expect(body.data.conversationId).toBe(conv.id);
    });

    it("returned message has an id and createdAt", async () => {
      const conv = await createConversation("Msg Fields Test", "logs");

      const res = await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: "Check fields" }),
      });
      const body = (await res.json()) as MessageBody;
      expect(typeof body.data.id).toBe("string");
      expect(body.data.id.length).toBeGreaterThan(0);
      expect(typeof body.data.createdAt).toBe("string");
      expect(body.data.createdAt.length).toBeGreaterThan(0);
    });

    it("returns 404 when the conversation does not exist", async () => {
      const res = await app.request("/api/ai/conversations/no-such-conv/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: "Hello" }),
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ErrorBody;
      expect(typeof body.message).toBe("string");
    });

    it("returns 400 when role is missing", async () => {
      const conv = await createConversation("Validation Test", "dashboard");

      const res = await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "No role provided" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when content is missing", async () => {
      const conv = await createConversation("No Content Test", "dashboard");

      const res = await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when content is an empty string", async () => {
      const conv = await createConversation("Empty Content Test", "dashboard");

      const res = await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: "" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when role is not user or assistant", async () => {
      const conv = await createConversation("Bad Role Test", "dashboard");

      const res = await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "system", content: "Invalid role" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when request body is empty", async () => {
      const conv = await createConversation("Empty Body Msg Test", "dashboard");

      const res = await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it("multiple messages can be added to the same conversation", async () => {
      const conv = await createConversation("Multi Message Test", "ec2");

      await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: "First" }),
      });
      await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "assistant", content: "Response" }),
      });
      await app.request(`/api/ai/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: "Follow-up" }),
      });

      const detailRes = await app.request(`/api/ai/conversations/${conv.id}`);
      const detailBody = (await detailRes.json()) as ConversationDetailBody;
      expect(detailBody.data.messages.length).toBe(3);
    });
  });

  describe("POST /api/ai/analyze", () => {
    it("returns a mock analysis response with agentType", async () => {
      const res = await app.request("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Analyze CPU usage patterns", pageContext: "ec2" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as AnalyzeBody;
      expect(typeof body.data.response).toBe("string");
      expect(body.data.response.length).toBeGreaterThan(0);
      expect(typeof body.data.agentType).toBe("string");
      expect(body.data.agentType.length).toBeGreaterThan(0);
    });

    it("defaults agentType to general when not provided", async () => {
      const res = await app.request("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Check costs", pageContext: "billing" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as AnalyzeBody;
      expect(body.data.agentType).toBe("general");
    });

    it("returns the provided agentType in the response", async () => {
      const res = await app.request("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Review IAM policies",
          pageContext: "security",
          agentType: "security",
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as AnalyzeBody;
      expect(body.data.agentType).toBe("security");
    });

    it("response string includes the pageContext value", async () => {
      const res = await app.request("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Summarize logs", pageContext: "cloudwatch-logs" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as AnalyzeBody;
      expect(body.data.response).toContain("cloudwatch-logs");
    });

    it("returns 400 when prompt is missing", async () => {
      const res = await app.request("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageContext: "ec2" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when pageContext is missing", async () => {
      const res = await app.request("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Analyze something" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when prompt is an empty string", async () => {
      const res = await app.request("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "", pageContext: "ec2" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when pageContext is an empty string", async () => {
      const res = await app.request("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Analyze", pageContext: "" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when agentType is an invalid enum value", async () => {
      const res = await app.request("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Analyze", pageContext: "ec2", agentType: "unknown-agent" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when request body is empty", async () => {
      const res = await app.request("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it("accepts all valid agentType enum values", async () => {
      const validTypes = [
        "log-analysis",
        "cost-optimization",
        "infrastructure",
        "security",
        "report-builder",
        "general",
      ] as const;

      for (const agentType of validTypes) {
        const res = await app.request("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "Test prompt", pageContext: "test", agentType }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as AnalyzeBody;
        expect(body.data.agentType).toBe(agentType);
      }
    });
  });
});
