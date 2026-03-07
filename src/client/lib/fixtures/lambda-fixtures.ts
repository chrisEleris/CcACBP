import type { LambdaFunction } from "@shared/types";

export const lambdaFunctions: LambdaFunction[] = [
  {
    name: "api-auth-handler",
    runtime: "nodejs20.x",
    memory: 256,
    timeout: 30,
    lastInvoked: "2026-03-01T10:45:00Z",
    invocations24h: 45230,
    errors24h: 12,
  },
  {
    name: "image-resize",
    runtime: "nodejs20.x",
    memory: 512,
    timeout: 60,
    lastInvoked: "2026-03-01T10:30:00Z",
    invocations24h: 8920,
    errors24h: 3,
  },
  {
    name: "cron-cleanup",
    runtime: "python3.12",
    memory: 128,
    timeout: 300,
    lastInvoked: "2026-03-01T06:00:00Z",
    invocations24h: 24,
    errors24h: 0,
  },
  {
    name: "webhook-processor",
    runtime: "nodejs20.x",
    memory: 256,
    timeout: 30,
    lastInvoked: "2026-03-01T10:44:00Z",
    invocations24h: 15340,
    errors24h: 45,
  },
];
