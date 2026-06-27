import { Hono } from "hono";
import { config } from "./config.js";
import { api_router } from "./routes/api.js";
import { mcp_router } from "./routes/mcp_route.js";
import { serve_router } from "./routes/serve.js";

const app = new Hono();

app.use("*", async (c, next) => {
  await next();
  c.res.headers.set("X-Powered-By", "html-hoster");
});

if (config.swagger_enabled) {
  const { docs_router } = await import("./routes/docs.js");
  app.get("/api/docs/", (c) => c.redirect("/api/docs", 301));
  app.route("/api/docs", docs_router);
}

// Health check — no auth, always 200
app.get("/health", (c) =>
  c.json({ status: "ok", mode: config.app_env, uptime: process.uptime() })
);

app.route("/api", api_router);
app.route("/mcp", mcp_router);

// Static assets from public/assets/
app.get("/assets/*", (c) => {
  const filename = c.req.path.slice("/assets/".length);
  if (!filename || filename.includes("..")) return c.text("404 — not found", 404);
  return new Response(Bun.file(`public/assets/${filename}`));
});

// Public serve — must come after /api and /assets
app.route("/", serve_router);

const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

console.log(`html-hoster listening on http://localhost:${server.port}`);
console.log(`Mode: ${config.app_env}`);
console.log(`Swagger: ${config.swagger_enabled ? `http://localhost:${server.port}/api/docs` : "disabled"}`);
console.log(`Storage: ${config.demo_mode ? "demo (no-op)" : config.storage_driver}`);
