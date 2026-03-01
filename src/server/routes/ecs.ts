import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

const scaleServiceSchema = z.object({
  desiredCount: z.number().int().min(0).max(100),
});

export const ecsRoutes = new Hono()
  .get("/clusters", (c) => {
    return c.json({
      data: [],
      message: "Connect AWS credentials in Settings to fetch live ECS cluster data",
    });
  })
  .get("/clusters/:name", (c) => {
    const name = c.req.param("name");
    return c.json({
      data: null,
      message: `Connect AWS credentials in Settings to fetch cluster: ${name}`,
    });
  })
  .get("/services/:cluster", (c) => {
    const cluster = c.req.param("cluster");
    return c.json({
      data: [],
      message: `Connect AWS credentials to fetch services for cluster: ${cluster}`,
    });
  })
  .get("/tasks/:cluster/:service", (c) => {
    const cluster = c.req.param("cluster");
    const service = c.req.param("service");
    return c.json({
      data: [],
      message: `Connect AWS credentials to fetch tasks for ${service} in ${cluster}`,
    });
  })
  .post("/services/:cluster/:service/scale", zValidator("json", scaleServiceSchema), (c) => {
    const cluster = c.req.param("cluster");
    const service = c.req.param("service");
    const { desiredCount } = c.req.valid("json");
    return c.json(
      {
        data: { cluster, service, desiredCount, applied: false },
        message: "Connect AWS credentials in Settings to scale services",
      },
      202,
    );
  })
  .post("/services/:cluster/:service/deploy", (c) => {
    const cluster = c.req.param("cluster");
    const service = c.req.param("service");
    return c.json(
      {
        data: { cluster, service, forceNewDeployment: true, applied: false },
        message: "Connect AWS credentials in Settings to force new deployments",
      },
      202,
    );
  })
  .post("/tasks/:cluster/:taskId/stop", (c) => {
    const cluster = c.req.param("cluster");
    const taskId = c.req.param("taskId");
    return c.json(
      {
        data: { cluster, taskId, stopped: false },
        message: "Connect AWS credentials in Settings to stop tasks",
      },
      202,
    );
  })
  .get("/events/:cluster", (c) => {
    const cluster = c.req.param("cluster");
    return c.json({
      data: [],
      message: `Connect AWS credentials to fetch events for cluster: ${cluster}`,
    });
  });
