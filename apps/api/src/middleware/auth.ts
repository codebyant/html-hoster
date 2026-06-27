import type { Context, Next } from "hono";
import { config } from "../config.js";

export async function require_api_key(c: Context, next: Next): Promise<Response | void> {
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token || token !== config.api_key) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  await next();
}
