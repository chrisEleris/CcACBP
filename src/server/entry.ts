import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { config } from "./config";
import app from "./index";

// Serve static frontend assets from dist/public (relative to cwd /app)
app.use("/*", serveStatic({ root: "./dist/public" }));

// SPA fallback - serve index.html for all non-API, non-static routes
app.get("*", serveStatic({ root: "./dist/public", path: "index.html" }));

const port = config.PORT;

if (!config.API_KEY && config.NODE_ENV === "production") {
  console.warn(
    "WARNING: No API_KEY configured in production. All mutation endpoints are unprotected. Set the API_KEY environment variable to enable authentication.",
  );
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://0.0.0.0:${info.port}`);
});
