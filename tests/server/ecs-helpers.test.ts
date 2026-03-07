import { describe, expect, it } from "vitest";
import {
  resolveClusterStatus,
  resolveContainerStatus,
  resolveDeploymentStatus,
  resolveEventType,
  resolveHealth,
  resolveLaunchType,
  resolveRolloutState,
  resolveServiceHealth,
  resolveServiceStatus,
  resolveTaskStatus,
} from "../../src/server/routes/ecs";

describe("ECS helper functions", () => {
  describe("resolveClusterStatus", () => {
    it("returns INACTIVE for INACTIVE", () => {
      expect(resolveClusterStatus("INACTIVE")).toBe("INACTIVE");
    });
    it("returns ACTIVE for ACTIVE", () => {
      expect(resolveClusterStatus("ACTIVE")).toBe("ACTIVE");
    });
    it("returns ACTIVE for undefined", () => {
      expect(resolveClusterStatus(undefined)).toBe("ACTIVE");
    });
  });

  describe("resolveServiceStatus", () => {
    it("returns DRAINING for DRAINING", () => {
      expect(resolveServiceStatus("DRAINING")).toBe("DRAINING");
    });
    it("returns INACTIVE for INACTIVE", () => {
      expect(resolveServiceStatus("INACTIVE")).toBe("INACTIVE");
    });
    it("returns ACTIVE for ACTIVE", () => {
      expect(resolveServiceStatus("ACTIVE")).toBe("ACTIVE");
    });
    it("returns ACTIVE for undefined", () => {
      expect(resolveServiceStatus(undefined)).toBe("ACTIVE");
    });
  });

  describe("resolveDeploymentStatus", () => {
    it("returns ACTIVE for ACTIVE", () => {
      expect(resolveDeploymentStatus("ACTIVE")).toBe("ACTIVE");
    });
    it("returns INACTIVE for INACTIVE", () => {
      expect(resolveDeploymentStatus("INACTIVE")).toBe("INACTIVE");
    });
    it("returns PRIMARY for PRIMARY", () => {
      expect(resolveDeploymentStatus("PRIMARY")).toBe("PRIMARY");
    });
    it("returns PRIMARY for undefined", () => {
      expect(resolveDeploymentStatus(undefined)).toBe("PRIMARY");
    });
  });

  describe("resolveRolloutState", () => {
    it("returns FAILED for FAILED", () => {
      expect(resolveRolloutState("FAILED")).toBe("FAILED");
    });
    it("returns IN_PROGRESS for IN_PROGRESS", () => {
      expect(resolveRolloutState("IN_PROGRESS")).toBe("IN_PROGRESS");
    });
    it("returns COMPLETED for COMPLETED", () => {
      expect(resolveRolloutState("COMPLETED")).toBe("COMPLETED");
    });
    it("returns COMPLETED for undefined", () => {
      expect(resolveRolloutState(undefined)).toBe("COMPLETED");
    });
  });

  describe("resolveTaskStatus", () => {
    it("returns PROVISIONING for PROVISIONING", () => {
      expect(resolveTaskStatus("PROVISIONING")).toBe("PROVISIONING");
    });
    it("returns PENDING for PENDING", () => {
      expect(resolveTaskStatus("PENDING")).toBe("PENDING");
    });
    it("returns RUNNING for RUNNING", () => {
      expect(resolveTaskStatus("RUNNING")).toBe("RUNNING");
    });
    it("returns STOPPING for STOPPING", () => {
      expect(resolveTaskStatus("STOPPING")).toBe("STOPPING");
    });
    it("returns STOPPED for STOPPED", () => {
      expect(resolveTaskStatus("STOPPED")).toBe("STOPPED");
    });
    it("returns STOPPED for undefined", () => {
      expect(resolveTaskStatus(undefined)).toBe("STOPPED");
    });
  });

  describe("resolveHealth", () => {
    it("returns HEALTHY for HEALTHY", () => {
      expect(resolveHealth("HEALTHY")).toBe("HEALTHY");
    });
    it("returns UNHEALTHY for UNHEALTHY", () => {
      expect(resolveHealth("UNHEALTHY")).toBe("UNHEALTHY");
    });
    it("returns UNKNOWN for undefined", () => {
      expect(resolveHealth(undefined)).toBe("UNKNOWN");
    });
    it("returns UNKNOWN for unknown string", () => {
      expect(resolveHealth("something")).toBe("UNKNOWN");
    });
  });

  describe("resolveContainerStatus", () => {
    it("returns RUNNING for RUNNING", () => {
      expect(resolveContainerStatus("RUNNING")).toBe("RUNNING");
    });
    it("returns STOPPED for STOPPED", () => {
      expect(resolveContainerStatus("STOPPED")).toBe("STOPPED");
    });
    it("returns PENDING for PENDING", () => {
      expect(resolveContainerStatus("PENDING")).toBe("PENDING");
    });
    it("returns PENDING for undefined", () => {
      expect(resolveContainerStatus(undefined)).toBe("PENDING");
    });
  });

  describe("resolveServiceHealth", () => {
    it("returns HEALTHY when desired is 0", () => {
      expect(resolveServiceHealth({ runningCount: 0, desiredCount: 0 })).toBe("HEALTHY");
    });
    it("returns HEALTHY when running equals desired", () => {
      expect(resolveServiceHealth({ runningCount: 3, desiredCount: 3 })).toBe("HEALTHY");
    });
    it("returns UNHEALTHY when running is 0 but desired > 0", () => {
      expect(resolveServiceHealth({ runningCount: 0, desiredCount: 3 })).toBe("UNHEALTHY");
    });
    it("returns ROLLING when running < desired but > 0", () => {
      expect(resolveServiceHealth({ runningCount: 1, desiredCount: 3 })).toBe("ROLLING");
    });
    it("handles undefined counts", () => {
      expect(resolveServiceHealth({})).toBe("HEALTHY");
    });
  });

  describe("resolveEventType", () => {
    it("returns ERROR for error messages", () => {
      expect(resolveEventType("service encountered an error")).toBe("ERROR");
    });
    it("returns ERROR for failure messages", () => {
      expect(resolveEventType("deployment failed")).toBe("ERROR");
    });
    it("returns SCALING for scale messages", () => {
      expect(resolveEventType("auto scale triggered")).toBe("SCALING");
    });
    it("returns SCALING for capacity messages", () => {
      expect(resolveEventType("adjusting capacity")).toBe("SCALING");
    });
    it("returns TASK for task messages", () => {
      expect(resolveEventType("started task abc123")).toBe("TASK");
    });
    it("returns DEPLOYMENT for other messages", () => {
      expect(resolveEventType("service updated successfully")).toBe("DEPLOYMENT");
    });
  });

  describe("resolveLaunchType", () => {
    it("returns EC2 for EC2", () => {
      expect(resolveLaunchType("EC2")).toBe("EC2");
    });
    it("returns FARGATE for FARGATE", () => {
      expect(resolveLaunchType("FARGATE")).toBe("FARGATE");
    });
    it("returns FARGATE for undefined", () => {
      expect(resolveLaunchType(undefined)).toBe("FARGATE");
    });
  });
});
