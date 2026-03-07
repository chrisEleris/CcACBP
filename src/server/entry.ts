import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { config } from "./config";
import app from "./index";

// Serve static frontend assets from dist/public (relative to cwd /app)
app.use("/*", serveStatic({ root: "./dist/public" }));

// SPA fallback - serve index.html for all non-API, non-static routes
app.get("*", serveStatic({ root: "./dist/public", path: "index.html" }));

const port = config.PORT;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://0.0.0.0:${info.port}`);
});
