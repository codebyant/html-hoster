import type { Context, Next } from "hono";
import { config } from "../config.js";

const WRITE_METHODS = new Set(["PUT", "POST", "DELETE", "PATCH"]);

export async function block_writes_in_demo(c: Context, next: Next): Promise<Response | void> {
  if (config.demo_mode && WRITE_METHODS.has(c.req.method)) {
    return c.json(
      { success: false, error: "Write operations are disabled in demo mode" },
      403
    );
  }
  await next();
}
