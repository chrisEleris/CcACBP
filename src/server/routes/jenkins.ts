import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

const deployConfigSchema = z.object({
  name: z.string().min(1),
  jenkinsJob: z.string().min(1),
  targetEnv: z.enum(["dev", "staging", "prod"]),
  targetService: z.string().min(1),
  awsRegion: z.string().min(1),
  deployStrategy: z.enum(["rolling", "blue-green", "canary"]),
  autoApprove: z.boolean(),
  parameters: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.enum(["string", "choice", "boolean"]),
        defaultValue: z.string(),
        description: z.string(),
      }),
    )
    .optional()
    .default([]),
});

const buildTriggerSchema = z.object({
  parameters: z.record(z.string()).optional().default({}),
});

export const jenkinsRoutes = new Hono()
  .get("/jobs", (c) => {
    return c.json({
      data: [],
      message: "Connect Jenkins server in Settings to fetch live data",
    });
  })
  .get("/jobs/:name", (c) => {
    const name = c.req.param("name");
    return c.json({
      data: null,
      message: `Connect Jenkins server in Settings to fetch live data for job: ${name}`,
    });
  })
  .post("/jobs/:name/build", zValidator("json", buildTriggerSchema), (c) => {
    const name = c.req.param("name");
    const { parameters } = c.req.valid("json");
    return c.json(
      {
        data: { jobName: name, parameters, queued: false },
        message: "Connect Jenkins server in Settings to trigger live builds",
      },
      202,
    );
  })
  .get("/builds/:jobName", (c) => {
    const jobName = c.req.param("jobName");
    return c.json({
      data: [],
      message: `Connect Jenkins server in Settings to fetch build history for: ${jobName}`,
    });
  })
  .get("/deploys", (c) => {
    return c.json({
      data: [],
      message: "Connect Jenkins server in Settings to fetch live deployment configurations",
    });
  })
  .post("/deploys", zValidator("json", deployConfigSchema), (c) => {
    const body = c.req.valid("json");
    return c.json(
      {
        data: { id: crypto.randomUUID(), ...body, lastDeployed: null, lastStatus: null },
        message: "Deploy configuration saved. Connect Jenkins server to activate.",
      },
      201,
    );
  })
  .put("/deploys/:id", zValidator("json", deployConfigSchema.partial()), (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    return c.json({
      data: { id, ...body },
      message: `Deploy configuration ${id} updated.`,
    });
  })
  .post("/deploys/:id/trigger", (c) => {
    const id = c.req.param("id");
    return c.json(
      {
        data: { deployConfigId: id, queued: false },
        message: "Connect Jenkins server in Settings to trigger live deployments",
      },
      202,
    );
  })
  .get("/server", (c) => {
    return c.json({
      data: null,
      message: "Connect Jenkins server in Settings to fetch live server info",
    });
  })
  .get("/queue", (c) => {
    return c.json({
      data: [],
      message: "Connect Jenkins server in Settings to fetch live queue data",
    });
  });
