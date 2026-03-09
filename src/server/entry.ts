import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { config } from "./config";
import { initDb } from "./db/index";
import app from "./index";

// Serve static frontend assets from dist/public (relative to cwd /app)
app.use("/*", serveStatic({ root: "./dist/public" }));

// SPA fallback - serve index.html for all non-API, non-static routes
app.get("*", serveStatic({ root: "./dist/public", path: "index.html" }));

const port = config.PORT;

if (!config.API_KEY && config.NODE_ENV === "production") {
  console.error(
    "FATAL: API_KEY is required in production. Set the API_KEY environment variable to enable authentication. Refusing to start.",
  );
  process.exit(1);
}

if (!config.SECRET_KEY && config.NODE_ENV === "production") {
  console.error(
    "FATAL: SECRET_KEY is required in production. Set the SECRET_KEY environment variable to enable credential encryption. Refusing to start.",
  );
  process.exit(1);
}

if (config.SECRET_KEY && config.SECRET_KEY.length < 32 && config.NODE_ENV === "production") {
  console.error(
    "FATAL: SECRET_KEY must be at least 32 characters long in production to provide adequate entropy for AES-256 key derivation. Refusing to start.",
  );
  process.exit(1);
}

// Explicitly initialise the DB before accepting traffic so that startup errors
// produce a clear message and a non-zero exit code rather than a bare rejection.
try {
  await initDb();
} catch (err) {
  console.error("FATAL: Database initialization failed, refusing to start:", err);
  process.exit(1);
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://0.0.0.0:${info.port}`);
});
