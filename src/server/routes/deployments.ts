import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

const triggerDeploySchema = z.object({
  service: z.string().min(1),
  version: z.string().min(1),
  imageTag: z.string().min(1),
  targetEnv: z.enum(["dev", "staging", "prod"]),
  strategy: z.enum(["rolling", "blue-green", "canary"]),
});

const approveSchema = z.object({
  approver: z.string().min(1),
  notes: z.string().optional().default(""),
});

const scheduleSchema = z.object({
  service: z.string().min(1),
  version: z.string().min(1),
  targetEnv: z.enum(["dev", "staging", "prod"]),
  scheduledFor: z.string().min(1),
  maintenanceWindow: z.string().min(1),
});

export const deployRoutes = new Hono()
  .get("/pipelines", (c) => {
    return c.json({
      data: [],
      message: "Connect CI/CD server in Settings to fetch live deployment pipelines",
    });
  })
  .get("/pipelines/:id", (c) => {
    const id = c.req.param("id");
    return c.json({
      data: null,
      message: `Connect CI/CD server in Settings to fetch pipeline: ${id}`,
    });
  })
  .post("/pipelines", zValidator("json", triggerDeploySchema), (c) => {
    const body = c.req.valid("json");
    return c.json(
      {
        data: { id: crypto.randomUUID(), ...body, status: "IN_PROGRESS" },
        message: "Connect CI/CD server in Settings to trigger live deployments",
      },
      202,
    );
  })
  .post("/pipelines/:id/approve", zValidator("json", approveSchema), (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    return c.json({
      data: { pipelineId: id, ...body, approved: false },
      message: "Connect CI/CD server in Settings to approve deployments",
    });
  })
  .post("/pipelines/:id/rollback", (c) => {
    const id = c.req.param("id");
    return c.json(
      {
        data: { pipelineId: id, rolledBack: false },
        message: "Connect CI/CD server in Settings to trigger rollbacks",
      },
      202,
    );
  })
  .get("/environments", (c) => {
    return c.json({
      data: [],
      message: "Connect AWS credentials to fetch environment state",
    });
  })
  .get("/schedules", (c) => {
    return c.json({
      data: [],
      message: "Connect CI/CD server to fetch deployment schedules",
    });
  })
  .post("/schedules", zValidator("json", scheduleSchema), (c) => {
    const body = c.req.valid("json");
    return c.json(
      {
        data: { id: crypto.randomUUID(), ...body, status: "SCHEDULED" },
        message: "Connect CI/CD server to schedule deployments",
      },
      201,
    );
  })
  .delete("/schedules/:id", (c) => {
    const id = c.req.param("id");
    return c.json({
      data: { id, cancelled: false },
      message: "Connect CI/CD server to cancel scheduled deployments",
    });
  })
  .get("/rollbacks", (c) => {
    return c.json({
      data: [],
      message: "Connect CI/CD server to fetch rollback history",
    });
  });
