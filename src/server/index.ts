import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { config } from "./config";
import { apiKeyAuth } from "./middleware/auth";
import { rateLimit } from "./middleware/rate-limit";
import { aiRoutes } from "./routes/ai";
import { awsRoutes } from "./routes/aws";
import { connectorRoutes } from "./routes/connectors";
import { dataSourceRoutes } from "./routes/data-sources";
import { deployRoutes } from "./routes/deployments";
import { ecsRoutes } from "./routes/ecs";
import { healthRoute } from "./routes/health";
import { jenkinsRoutes } from "./routes/jenkins";
import { queryRoutes } from "./routes/query";
import { reportRoutes } from "./routes/reports";
import { scheduledReportRoutes } from "./routes/scheduled-reports";

const app = new Hono();

app.use(
  "*",
  cors({
    origin:
      config.NODE_ENV === "production"
        ? "https://chrisEleris.github.io"
        : ["http://localhost:5173", "http://localhost:4173", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    maxAge: 86400,
  }),
);
app.use("*", secureHeaders());
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 1024 * 1024,
    onError: (c) => c.json({ message: "Request body too large" }, 413),
  }),
);
app.use("/api/*", apiKeyAuth);

// Global rate limit: 200 requests per minute per IP.
// In test mode the limits are raised to avoid interfering with the test suite.
const isTest = config.NODE_ENV === "test";
app.use("/api/*", rateLimit(isTest ? 10_000 : 200, 60_000));

// Stricter limits for expensive / destructive endpoints (skipped in test mode).
if (!isTest) {
  // AI analyze can invoke external LLM APIs with cost implications.
  app.use("/api/ai/analyze", rateLimit(10, 60_000));
  // ECS mutation endpoints issue live AWS infrastructure changes.
  app.use("/api/ecs/*", rateLimit(30, 60_000));
}

app.route("/api", healthRoute);
app.route("/api/ai", aiRoutes);
app.route("/api/aws", awsRoutes);
app.route("/api/connectors", connectorRoutes);
app.route("/api/data-sources", dataSourceRoutes);
app.route("/api/deploy", deployRoutes);
app.route("/api/ecs", ecsRoutes);
app.route("/api/jenkins", jenkinsRoutes);
app.route("/api/query", queryRoutes);
app.route("/api/reports", reportRoutes);
app.route("/api/scheduled-reports", scheduledReportRoutes);

export default app;
export type AppType = typeof app;
