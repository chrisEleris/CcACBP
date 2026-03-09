import {
  DescribeClustersCommand,
  DescribeServicesCommand,
  DescribeTasksCommand,
  ListClustersCommand,
  ListServicesCommand,
  ListTasksCommand,
  StopTaskCommand,
  UpdateServiceCommand,
} from "@aws-sdk/client-ecs";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type {
  ECSCluster,
  ECSContainer,
  ECSDeployment,
  ECSDeploymentStatus,
  ECSEvent,
  ECSRolloutState,
  ECSService,
  ECSServiceHealth,
  ECSTask,
  ECSTaskStatus,
} from "../../shared/types";
import { config } from "../config";
import { ecsClient } from "../services/aws-clients";

// Safe character set for ECS resource identifiers (cluster names, service names, task IDs, ARNs).
const ECS_PARAM_REGEX = /^[a-zA-Z0-9\-_/.:\s]*$/;
const MAX_PARAM_LENGTH = 255;

/** Zod schema for a single ECS path parameter (cluster, service, or task identifier). */
const ecsParamSchema = z
  .string()
  .min(1)
  .max(MAX_PARAM_LENGTH)
  .regex(ECS_PARAM_REGEX, "Invalid characters in resource identifier");

/**
 * Returns the set of allowed cluster names/ARNs derived from the ALLOWED_ECS_CLUSTERS env var,
 * or null when the env var is unset (meaning all clusters are permitted).
 */
function getAllowedClusters(): Set<string> | null {
  if (!config.ALLOWED_ECS_CLUSTERS) return null;
  const names = config.ALLOWED_ECS_CLUSTERS.split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return names.length > 0 ? new Set(names) : null;
}

/**
 * Validates a cluster identifier against the ALLOWED_ECS_CLUSTERS allow-list.
 * Returns an error response string when the cluster is not permitted, or null when it is.
 */
function checkClusterAllowed(cluster: string): string | null {
  const allowed = getAllowedClusters();
  if (allowed === null) return null;
  if (!allowed.has(cluster)) {
    return `Cluster '${cluster}' is not in the list of allowed clusters`;
  }
  return null;
}

const scaleServiceSchema = z.object({
  desiredCount: z.number().int().min(0).max(100),
});

export function resolveClusterStatus(raw: string | undefined): ECSCluster["status"] {
  return raw === "INACTIVE" ? "INACTIVE" : "ACTIVE";
}

export function resolveServiceStatus(raw: string | undefined): ECSService["status"] {
  if (raw === "DRAINING") return "DRAINING";
  if (raw === "INACTIVE") return "INACTIVE";
  return "ACTIVE";
}

export function resolveDeploymentStatus(raw: string | undefined): ECSDeploymentStatus {
  if (raw === "ACTIVE") return "ACTIVE";
  if (raw === "INACTIVE") return "INACTIVE";
  return "PRIMARY";
}

export function resolveRolloutState(raw: string | undefined): ECSRolloutState {
  if (raw === "FAILED") return "FAILED";
  if (raw === "IN_PROGRESS") return "IN_PROGRESS";
  return "COMPLETED";
}

export function resolveTaskStatus(raw: string | undefined): ECSTaskStatus {
  if (raw === "PROVISIONING") return "PROVISIONING";
  if (raw === "PENDING") return "PENDING";
  if (raw === "RUNNING") return "RUNNING";
  if (raw === "STOPPING") return "STOPPING";
  return "STOPPED";
}

export function resolveHealth(raw: string | undefined): "HEALTHY" | "UNHEALTHY" | "UNKNOWN" {
  if (raw === "HEALTHY") return "HEALTHY";
  if (raw === "UNHEALTHY") return "UNHEALTHY";
  return "UNKNOWN";
}

export function resolveContainerStatus(raw: string | undefined): ECSContainer["status"] {
  if (raw === "RUNNING") return "RUNNING";
  if (raw === "STOPPED") return "STOPPED";
  return "PENDING";
}

export function resolveServiceHealth(svc: {
  runningCount?: number;
  desiredCount?: number;
}): ECSServiceHealth {
  const running = svc.runningCount ?? 0;
  const desired = svc.desiredCount ?? 0;
  if (desired === 0) return "HEALTHY";
  if (running === desired) return "HEALTHY";
  if (running === 0) return "UNHEALTHY";
  return "ROLLING";
}

export function resolveEventType(message: string): ECSEvent["type"] {
  const lower = message.toLowerCase();
  if (lower.includes("error") || lower.includes("fail")) return "ERROR";
  if (lower.includes("scale") || lower.includes("capacity")) return "SCALING";
  if (lower.includes("task")) return "TASK";
  return "DEPLOYMENT";
}

export function resolveLaunchType(raw: string | undefined): "FARGATE" | "EC2" {
  return raw === "EC2" ? "EC2" : "FARGATE";
}

export const ecsRoutes = new Hono()
  .get("/clusters", async (c) => {
    try {
      const listResponse = await ecsClient.send(new ListClustersCommand({}));
      const clusterArns = listResponse.clusterArns ?? [];

      if (clusterArns.length === 0) {
        return c.json({ data: [], error: null });
      }

      const descResponse = await ecsClient.send(
        new DescribeClustersCommand({ clusters: clusterArns }),
      );

      const clusters: ECSCluster[] = (descResponse.clusters ?? []).map((cluster) => {
        const statsMap = new Map<string, number>();
        for (const stat of cluster.statistics ?? []) {
          statsMap.set(stat.name ?? "", Number(stat.value ?? "0"));
        }

        return {
          name: cluster.clusterName ?? "unknown",
          arn: cluster.clusterArn ?? "",
          status: resolveClusterStatus(cluster.status),
          registeredInstances: cluster.registeredContainerInstancesCount ?? 0,
          runningTasks: cluster.runningTasksCount ?? 0,
          pendingTasks: cluster.pendingTasksCount ?? 0,
          activeServices: cluster.activeServicesCount ?? 0,
          cpuReservation: statsMap.get("CPUReservation") ?? 0,
          memoryReservation: statsMap.get("MemoryReservation") ?? 0,
          cpuUtilization: statsMap.get("CPUUtilization") ?? 0,
          memoryUtilization: statsMap.get("MemoryUtilization") ?? 0,
        };
      });

      return c.json({ data: clusters, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error fetching ECS clusters";
      console.error("ECS ListClusters/DescribeClusters error:", err);
      return c.json({ data: [], error: message });
    }
  })
  .get("/clusters/:name", async (c) => {
    const nameParsed = ecsParamSchema.safeParse(c.req.param("name"));
    if (!nameParsed.success) {
      return c.json({ data: null, error: "Invalid cluster identifier" }, 400);
    }
    const name = nameParsed.data;
    const clusterError = checkClusterAllowed(name);
    if (clusterError) {
      return c.json({ data: null, error: clusterError }, 403);
    }
    try {
      const descResponse = await ecsClient.send(new DescribeClustersCommand({ clusters: [name] }));

      const raw = descResponse.clusters?.[0];
      if (!raw) {
        return c.json({ data: null, error: `Cluster not found: ${name}` }, 404);
      }

      const cluster: ECSCluster = {
        name: raw.clusterName ?? "unknown",
        arn: raw.clusterArn ?? "",
        status: resolveClusterStatus(raw.status),
        registeredInstances: raw.registeredContainerInstancesCount ?? 0,
        runningTasks: raw.runningTasksCount ?? 0,
        pendingTasks: raw.pendingTasksCount ?? 0,
        activeServices: raw.activeServicesCount ?? 0,
        cpuReservation: 0,
        memoryReservation: 0,
        cpuUtilization: 0,
        memoryUtilization: 0,
      };

      return c.json({ data: cluster, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Unknown error fetching cluster: ${name}`;
      console.error("ECS DescribeClusters error:", err);
      return c.json({ data: null, error: message });
    }
  })
  .get("/services/:cluster", async (c) => {
    const clusterParsed = ecsParamSchema.safeParse(c.req.param("cluster"));
    if (!clusterParsed.success) {
      return c.json({ data: [], error: "Invalid cluster identifier" }, 400);
    }
    const cluster = clusterParsed.data;
    const clusterError = checkClusterAllowed(cluster);
    if (clusterError) {
      return c.json({ data: [], error: clusterError }, 403);
    }
    try {
      const listResponse = await ecsClient.send(new ListServicesCommand({ cluster }));
      const serviceArns = listResponse.serviceArns ?? [];

      if (serviceArns.length === 0) {
        return c.json({ data: [], error: null });
      }

      const descResponse = await ecsClient.send(
        new DescribeServicesCommand({ cluster, services: serviceArns }),
      );

      const services: ECSService[] = (descResponse.services ?? []).map((svc) => {
        const deployments: ECSDeployment[] = (svc.deployments ?? []).map((dep) => ({
          id: dep.id ?? "",
          status: resolveDeploymentStatus(dep.status),
          rolloutState: resolveRolloutState(dep.rolloutState),
          taskDefinition: dep.taskDefinition ?? "",
          desiredCount: dep.desiredCount ?? 0,
          runningCount: dep.runningCount ?? 0,
          pendingCount: dep.pendingCount ?? 0,
          createdAt: dep.createdAt?.toISOString() ?? new Date().toISOString(),
          updatedAt: dep.updatedAt?.toISOString() ?? new Date().toISOString(),
        }));

        const primaryDeployment = svc.deployments?.find((d) => d.status === "PRIMARY");
        const lastDeploymentDate =
          primaryDeployment?.updatedAt?.toISOString() ??
          svc.createdAt?.toISOString() ??
          new Date().toISOString();

        const lb = svc.loadBalancers?.[0];
        const loadBalancerTarget = lb
          ? `${lb.targetGroupArn ?? lb.loadBalancerName ?? ""}:${lb.containerPort ?? ""}`
          : null;

        return {
          name: svc.serviceName ?? "unknown",
          arn: svc.serviceArn ?? "",
          clusterName: cluster,
          status: resolveServiceStatus(svc.status),
          health: resolveServiceHealth(svc),
          taskDefinition: svc.taskDefinition ?? "",
          desiredCount: svc.desiredCount ?? 0,
          runningCount: svc.runningCount ?? 0,
          pendingCount: svc.pendingCount ?? 0,
          launchType: resolveLaunchType(svc.launchType),
          deployments,
          loadBalancerTarget,
          scaling: {
            enabled: false,
            minCapacity: 0,
            maxCapacity: 0,
            policies: [],
          },
          cpuUtilization: 0,
          memoryUtilization: 0,
          createdAt: svc.createdAt?.toISOString() ?? new Date().toISOString(),
          lastDeployment: lastDeploymentDate,
          updatedBy: "AWS",
        };
      });

      return c.json({ data: services, error: null });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : `Unknown error fetching services for cluster: ${cluster}`;
      console.error("ECS ListServices/DescribeServices error:", err);
      return c.json({ data: [], error: message });
    }
  })
  .get("/tasks/:cluster/:service", async (c) => {
    const clusterParsed = ecsParamSchema.safeParse(c.req.param("cluster"));
    const serviceParsed = ecsParamSchema.safeParse(c.req.param("service"));
    if (!clusterParsed.success || !serviceParsed.success) {
      return c.json({ data: [], error: "Invalid cluster or service identifier" }, 400);
    }
    const cluster = clusterParsed.data;
    const service = serviceParsed.data;
    const clusterError = checkClusterAllowed(cluster);
    if (clusterError) {
      return c.json({ data: [], error: clusterError }, 403);
    }
    try {
      const listResponse = await ecsClient.send(
        new ListTasksCommand({ cluster, serviceName: service }),
      );
      const taskArns = listResponse.taskArns ?? [];

      if (taskArns.length === 0) {
        return c.json({ data: [], error: null });
      }

      const descResponse = await ecsClient.send(
        new DescribeTasksCommand({ cluster, tasks: taskArns }),
      );

      const tasks: ECSTask[] = (descResponse.tasks ?? []).map((task) => {
        const taskArn = task.taskArn ?? "";
        const taskId = taskArn.split("/").pop() ?? taskArn;

        const containers: ECSContainer[] = (task.containers ?? []).map((container) => ({
          name: container.name ?? "unknown",
          image: container.image ?? "",
          cpu: Number(container.cpu ?? "0"),
          memory: Number(container.memory ?? "0"),
          status: resolveContainerStatus(container.lastStatus),
          healthStatus: resolveHealth(container.healthStatus),
          lastStartedAt: task.startedAt?.toISOString() ?? new Date().toISOString(),
        }));

        const privateIp =
          task.attachments
            ?.flatMap((a) => a.details ?? [])
            .find((d) => d.name === "privateIPv4Address")?.value ?? "";

        return {
          taskId,
          taskDefinition: task.taskDefinitionArn ?? "",
          serviceName: service,
          clusterName: cluster,
          status: resolveTaskStatus(task.lastStatus),
          healthStatus: resolveHealth(task.healthStatus),
          cpu: Number(task.cpu ?? "0"),
          memory: Number(task.memory ?? "0"),
          cpuUtilization: 0,
          memoryUtilization: 0,
          containers,
          startedAt: task.startedAt?.toISOString() ?? new Date().toISOString(),
          stoppedAt: task.stoppedAt?.toISOString() ?? null,
          stoppedReason: task.stoppedReason ?? null,
          launchType: resolveLaunchType(task.launchType),
          privateIp,
        };
      });

      return c.json({ data: tasks, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Unknown error fetching tasks for service: ${service}`;
      console.error("ECS ListTasks/DescribeTasks error:", err);
      return c.json({ data: [], error: message });
    }
  })
  .post("/services/:cluster/:service/scale", zValidator("json", scaleServiceSchema), async (c) => {
    const clusterRaw = c.req.param("cluster");
    const serviceRaw = c.req.param("service");

    const clusterParsed = ecsParamSchema.safeParse(clusterRaw);
    const serviceParsed = ecsParamSchema.safeParse(serviceRaw);
    if (!clusterParsed.success || !serviceParsed.success) {
      return c.json({ message: "Invalid cluster or service identifier" }, 400);
    }

    const cluster = clusterParsed.data;
    const service = serviceParsed.data;
    const clusterError = checkClusterAllowed(cluster);
    if (clusterError) {
      return c.json({ message: clusterError }, 403);
    }

    const { desiredCount } = c.req.valid("json");
    try {
      await ecsClient.send(new UpdateServiceCommand({ cluster, service, desiredCount }));

      return c.json({ data: { cluster, service, desiredCount, applied: true }, error: null }, 202);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Unknown error scaling service: ${service}`;
      console.error("ECS UpdateService (scale) error:", err);
      return c.json(
        { data: { cluster, service, desiredCount, applied: false }, error: message },
        500,
      );
    }
  })
  .post("/services/:cluster/:service/deploy", async (c) => {
    const clusterRaw = c.req.param("cluster");
    const serviceRaw = c.req.param("service");

    const clusterParsed = ecsParamSchema.safeParse(clusterRaw);
    const serviceParsed = ecsParamSchema.safeParse(serviceRaw);
    if (!clusterParsed.success || !serviceParsed.success) {
      return c.json({ message: "Invalid cluster or service identifier" }, 400);
    }

    const cluster = clusterParsed.data;
    const service = serviceParsed.data;
    const clusterError = checkClusterAllowed(cluster);
    if (clusterError) {
      return c.json({ message: clusterError }, 403);
    }

    try {
      await ecsClient.send(
        new UpdateServiceCommand({ cluster, service, forceNewDeployment: true }),
      );

      return c.json(
        { data: { cluster, service, forceNewDeployment: true, applied: true }, error: null },
        202,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Unknown error deploying service: ${service}`;
      console.error("ECS UpdateService (deploy) error:", err);
      return c.json(
        { data: { cluster, service, forceNewDeployment: true, applied: false }, error: message },
        500,
      );
    }
  })
  .post("/tasks/:cluster/:taskId/stop", async (c) => {
    const clusterRaw = c.req.param("cluster");
    const taskIdRaw = c.req.param("taskId");

    const clusterParsed = ecsParamSchema.safeParse(clusterRaw);
    const taskIdParsed = ecsParamSchema.safeParse(taskIdRaw);
    if (!clusterParsed.success || !taskIdParsed.success) {
      return c.json({ message: "Invalid cluster or task identifier" }, 400);
    }

    const cluster = clusterParsed.data;
    const taskId = taskIdParsed.data;
    const clusterError = checkClusterAllowed(cluster);
    if (clusterError) {
      return c.json({ message: clusterError }, 403);
    }

    try {
      await ecsClient.send(
        new StopTaskCommand({ cluster, task: taskId, reason: "Stopped by user via dashboard" }),
      );

      return c.json({ data: { cluster, taskId, stopped: true }, error: null }, 202);
    } catch (err) {
      const message = err instanceof Error ? err.message : `Unknown error stopping task: ${taskId}`;
      console.error("ECS StopTask error:", err);
      return c.json({ data: { cluster, taskId, stopped: false }, error: message }, 500);
    }
  })
  .get("/events/:cluster", async (c) => {
    const clusterParsed = ecsParamSchema.safeParse(c.req.param("cluster"));
    if (!clusterParsed.success) {
      return c.json({ data: [], error: "Invalid cluster identifier" }, 400);
    }
    const cluster = clusterParsed.data;
    const clusterError = checkClusterAllowed(cluster);
    if (clusterError) {
      return c.json({ data: [], error: clusterError }, 403);
    }
    try {
      const listResponse = await ecsClient.send(new ListServicesCommand({ cluster }));
      const serviceArns = listResponse.serviceArns ?? [];

      if (serviceArns.length === 0) {
        return c.json({ data: [], error: null });
      }

      const descResponse = await ecsClient.send(
        new DescribeServicesCommand({ cluster, services: serviceArns }),
      );

      const events: ECSEvent[] = [];
      for (const svc of descResponse.services ?? []) {
        const serviceName = svc.serviceName ?? "unknown";
        for (const event of svc.events ?? []) {
          const message = event.message ?? "";
          events.push({
            id: event.id ?? `${serviceName}-${event.createdAt?.getTime() ?? Date.now()}`,
            timestamp: event.createdAt?.toISOString() ?? new Date().toISOString(),
            serviceName,
            clusterName: cluster,
            message,
            type: resolveEventType(message),
          });
        }
      }

      // Sort newest first
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return c.json({ data: events, error: null });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : `Unknown error fetching events for cluster: ${cluster}`;
      console.error("ECS events error:", err);
      return c.json({ data: [], error: message });
    }
  });
