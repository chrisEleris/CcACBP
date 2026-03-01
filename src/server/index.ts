import { Hono } from "hono";
import { healthRoute } from "./routes/health";

const app = new Hono();

app.route("/api", healthRoute);

export default app;
export type AppType = typeof app;
