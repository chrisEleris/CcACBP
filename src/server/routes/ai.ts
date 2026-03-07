import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index";
import { aiConversations, aiMessages } from "../db/schema";

const MAX_TITLE = 500;
const MAX_CONTENT = 50_000;
const MAX_CONTEXT = 200;

const createConversationSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE),
  pageContext: z.string().min(1).max(MAX_CONTEXT),
  agentType: z
    .enum([
      "log-analysis",
      "cost-optimization",
      "infrastructure",
      "security",
      "report-builder",
      "general",
    ])
    .optional(),
});

const addMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_CONTENT),
  metadata: z.string().max(MAX_CONTENT).optional(),
});

const analyzeSchema = z.object({
  prompt: z.string().min(1).max(MAX_CONTENT),
  pageContext: z.string().min(1).max(MAX_CONTEXT),
  agentType: z
    .enum([
      "log-analysis",
      "cost-optimization",
      "infrastructure",
      "security",
      "report-builder",
      "general",
    ])
    .optional(),
});

type AgentInfo = {
  type: string;
  name: string;
  description: string;
};

const availableAgents: AgentInfo[] = [
  {
    type: "log-analysis",
    name: "Log Analysis Agent",
    description: "Expert at CloudWatch log pattern detection",
  },
  {
    type: "cost-optimization",
    name: "Cost Optimization Agent",
    description: "Expert at AWS cost analysis",
  },
  {
    type: "infrastructure",
    name: "Infrastructure Agent",
    description: "Expert at EC2/ECS sizing",
  },
  {
    type: "security",
    name: "Security Agent",
    description: "Expert at IAM policy review",
  },
  {
    type: "report-builder",
    name: "Report Builder Agent",
    description: "Expert at translating natural language to SQL",
  },
  {
    type: "general",
    name: "General Analytics Agent",
    description: "Cross-source data analysis",
  },
];

export const aiRoutes = new Hono()
  .get("/conversations", async (c) => {
    try {
      const pageContext = c.req.query("pageContext");
      const filtered = await db
        .select()
        .from(aiConversations)
        .where(pageContext ? eq(aiConversations.pageContext, pageContext) : undefined)
        .orderBy(desc(aiConversations.createdAt));

      return c.json({ data: filtered });
    } catch (error) {
      console.error("Error listing conversations:", error);
      return c.json({ message: "Failed to list conversations" }, 500);
    }
  })

  .post("/conversations", zValidator("json", createConversationSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const now = new Date().toISOString();
      const [created] = await db
        .insert(aiConversations)
        .values({
          id: crypto.randomUUID(),
          title: data.title,
          pageContext: data.pageContext,
          agentType: data.agentType ?? "general",
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return c.json({ data: created }, 201);
    } catch (error) {
      console.error("Error creating conversation:", error);
      return c.json({ message: "Failed to create conversation" }, 500);
    }
  })

  .get("/conversations/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const [conversation] = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.id, id));
      if (!conversation) {
        return c.json({ message: "Conversation not found" }, 404);
      }

      const messages = await db
        .select()
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, id))
        .orderBy(aiMessages.createdAt);

      return c.json({ data: { conversation, messages } });
    } catch (error) {
      console.error("Error getting conversation:", error);
      return c.json({ message: "Failed to get conversation" }, 500);
    }
  })

  .delete("/conversations/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const [existing] = await db.select().from(aiConversations).where(eq(aiConversations.id, id));
      if (!existing) {
        return c.json({ message: "Conversation not found" }, 404);
      }

      // Delete messages first (no FK cascade in SQLite without pragma)
      await db.delete(aiMessages).where(eq(aiMessages.conversationId, id));
      await db.delete(aiConversations).where(eq(aiConversations.id, id));

      return c.json({ data: { message: "Conversation deleted" } });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return c.json({ message: "Failed to delete conversation" }, 500);
    }
  })

  .post("/conversations/:id/messages", zValidator("json", addMessageSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");

      const [existing] = await db.select().from(aiConversations).where(eq(aiConversations.id, id));
      if (!existing) {
        return c.json({ message: "Conversation not found" }, 404);
      }

      const now = new Date().toISOString();
      const [message] = await db
        .insert(aiMessages)
        .values({
          id: crypto.randomUUID(),
          conversationId: id,
          role: data.role,
          content: data.content,
          metadata: data.metadata ?? "{}",
          createdAt: now,
        })
        .returning();

      // Update conversation updatedAt
      await db.update(aiConversations).set({ updatedAt: now }).where(eq(aiConversations.id, id));

      return c.json({ data: message }, 201);
    } catch (error) {
      console.error("Error adding message:", error);
      return c.json({ message: "Failed to add message" }, 500);
    }
  })

  .get("/agents", (c) => {
    return c.json({ data: availableAgents });
  })

  .post("/analyze", zValidator("json", analyzeSchema), async (c) => {
    try {
      const { prompt, pageContext, agentType } = c.req.valid("json");

      const resolvedAgentType = agentType ?? "general";

      return c.json({
        data: {
          response: `Based on the ${pageContext} data for your query "${prompt.slice(0, 100)}": This is a mock analysis response. In a real implementation, the ${resolvedAgentType} agent would process your query and provide actionable insights.`,
          agentType: resolvedAgentType,
        },
      });
    } catch (error) {
      console.error("Error running AI analysis:", error);
      return c.json({ message: "Failed to run analysis" }, 500);
    }
  });
