import { Hono } from "hono";
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
