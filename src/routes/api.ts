import { Hono } from "hono";
import type { Context } from "hono";
import { require_api_key } from "../middleware/auth.js";
import { block_writes_in_demo } from "../middleware/demo.js";
import { create_storage } from "../storage/index.js";
import { normalize_path, PathError } from "../utils/path.js";
import { config } from "../config.js";

const storage = create_storage();

export const api_router = new Hono();

api_router.use("/pages/*", block_writes_in_demo);
api_router.use("/pages/*", require_api_key);

// GET /api/pages — list all published pages (auth required)
api_router.get("/pages", require_api_key, async (c) => {
  const pages = await storage.list();
  return c.json({
    pages: pages.map((p) => ({
      path: p.path,
      url: `${config.public_base_url}/${p.path}`,
      updated_at: p.updated_at,
    })),
  });
});

function extract_path(c: Context): { page_path: string } | Response {
  const raw = c.req.path.replace(/^\/api\/pages\/?/, "");
  try {
    return { page_path: normalize_path(raw) };
  } catch (e) {
    const msg = e instanceof PathError ? e.message : "Invalid path";
    return c.json({ success: false, error: msg }, 400) as Response;
  }
}

function check_size(html: string): Response | null {
  const bytes = Buffer.byteLength(html, "utf-8");
  if (bytes > config.max_html_bytes) {
    const limit = (config.max_html_bytes / 1024 / 1024).toFixed(1);
    return new Response(
      JSON.stringify({ success: false, error: `HTML exceeds size limit of ${limit} MB` }),
      { status: 413, headers: { "Content-Type": "application/json" } }
    );
  }
  return null;
}

// PUT /api/pages/:path — create or update via JSON body
api_router.put("/pages/*", async (c) => {
  const result = extract_path(c);
  if (result instanceof Response) return result;
  const { page_path } = result;

  let body: { html?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: "Invalid JSON body" }, 400);
  }

  if (typeof body.html !== "string" || !body.html.trim()) {
    return c.json({ success: false, error: "Field 'html' must be a non-empty string" }, 400);
  }

  const size_err = check_size(body.html);
  if (size_err) return size_err;

  await storage.write(page_path, body.html);
  return c.json({ success: true, url: `${config.public_base_url}/${page_path}`, path: page_path });
});

// POST /api/pages/:path — create or update via multipart file upload
api_router.post("/pages/*", async (c) => {
  const result = extract_path(c);
  if (result instanceof Response) return result;
  const { page_path } = result;

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ success: false, error: "Expected multipart/form-data body" }, 400);
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return c.json({ success: false, error: "Field 'file' must be an HTML file (multipart/form-data)" }, 400);
  }

  const html = await file.text();
  if (!html.trim()) {
    return c.json({ success: false, error: "Uploaded file is empty" }, 400);
  }

  const size_err = check_size(html);
  if (size_err) return size_err;

  await storage.write(page_path, html);
  return c.json({ success: true, url: `${config.public_base_url}/${page_path}`, path: page_path });
});

// GET /api/pages/:path — metadata
api_router.get("/pages/*", async (c) => {
  const result = extract_path(c);
  if (result instanceof Response) return result;
  const { page_path } = result;

  const meta = await storage.stat(page_path);
  if (!meta) return c.json({ success: false, error: "Page not found" }, 404);

  return c.json({ path: meta.path, url: `${config.public_base_url}/${page_path}`, updated_at: meta.updated_at });
});

// DELETE /api/pages/:path
api_router.delete("/pages/*", async (c) => {
  const result = extract_path(c);
  if (result instanceof Response) return result;
  const { page_path } = result;

  const existed = await storage.remove(page_path);
  if (!existed) return c.json({ success: false, error: "Page not found" }, 404);

  return c.json({ success: true, path: page_path });
});
