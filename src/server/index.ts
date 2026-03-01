import { Hono } from "hono";
import { awsRoutes } from "./routes/aws";
import { connectorRoutes } from "./routes/connectors";
import { healthRoute } from "./routes/health";

const app = new Hono();

app.route("/api", healthRoute);
app.route("/api/aws", awsRoutes);
app.route("/api/connectors", connectorRoutes);

export default app;
export type AppType = typeof app;
