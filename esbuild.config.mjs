import { build } from "esbuild";

await build({
  entryPoints: ["src/server/entry.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/server/index.js",
  packages: "external",
  alias: {
    "@": "./src",
    "@server": "./src/server",
    "@shared": "./src/shared",
  },
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
});

console.log("Server build complete: dist/server/index.js");
