import { Hono } from "hono";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { create_storage } from "../storage/index.js";
import { normalize_path, PathError } from "../utils/path.js";

const storage = create_storage();

const LANDING_PAGE = path.resolve("public/index.html");

export const serve_router = new Hono();

// GET / — landing page
serve_router.get("/", async (c) => {
  if (config.root_redirect) return c.redirect(config.root_redirect, 301);
  if (config.landing_disabled) return c.text("404 — not found", 404);
  try {
    const html = await fs.readFile(LANDING_PAGE, "utf-8");
    return c.body(html, 200, { "Content-Type": "text/html; charset=utf-8" });
  } catch {
    return c.text("html-hoster", 200);
  }
});

// GET /i18n/:lang.json — serve translation files
serve_router.get("/i18n/:file", async (c) => {
  const filename = c.req.param("file");
  if (!/^[a-z]{2,5}(-[A-Za-z]{2,4})?\.json$/.test(filename)) {
    return c.text("404 — not found", 404);
  }
  try {
    const content = await fs.readFile(path.resolve(`public/i18n/${filename}`), "utf-8");
    return c.body(content, 200, { "Content-Type": "application/json; charset=utf-8" });
  } catch {
    return c.text("404 — not found", 404);
  }
});

// GET /:path — public HTML serving
serve_router.get("/*", async (c) => {
  const raw_path = c.req.path.replace(/^\//, "");

  if (!raw_path) {
    return c.redirect("/", 301);
  }

  let page_path: string;
  try {
    page_path = normalize_path(raw_path);
  } catch (e) {
    // Reserved paths (e.g. /api/*) and invalid paths are simply not found here
    return c.text("404 — page not found", 404);
  }

  const html = await storage.read(page_path);
  if (html === null) {
    return c.text("404 — page not found", 404);
  }

  const FAVICON_TAG = '<link rel="icon" type="image/svg+xml" href="/assets/logo.svg">';
  const injected = html.includes("</head>")
    ? html.replace("</head>", `${FAVICON_TAG}</head>`)
    : FAVICON_TAG + html;

  return c.body(injected, 200, {
    "Content-Type": "text/html; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "no-referrer",
  });
});
