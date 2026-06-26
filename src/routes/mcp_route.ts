import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { create_storage } from "../storage/index.js";
import { normalize_path, PathError } from "../utils/path.js";
import { require_api_key } from "../middleware/auth.js";

export const mcp_router = new Hono();

const storage = create_storage();

// ── Custom SSE transport (Hono-compatible) ───────────────────────────────────

class SseTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  private _write: (msg: JSONRPCMessage) => Promise<void>;

  constructor(write: (msg: JSONRPCMessage) => Promise<void>) {
    this._write = write;
  }

  async start() {}

  async send(message: JSONRPCMessage) {
    await this._write(message);
  }

  async close() {
    this.onclose?.();
  }

  receive(message: JSONRPCMessage) {
    this.onmessage?.(message);
  }
}

const sessions = new Map<string, SseTransport>();

// ── MCP Server factory ───────────────────────────────────────────────────────

function build_mcp_server(): Server {
  const server = new Server(
    { name: "html-hoster", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "publish_page",
        description:
          "Publish or replace a static HTML page at a chosen URL path. " +
          `Pages are served publicly at ${config.public_base_url}/<path>.`,
        inputSchema: {
          type: "object",
          required: ["path", "html"],
          properties: {
            path: {
              type: "string",
              description:
                "URL slug where the page will be served. " +
                "Only [a-zA-Z0-9_-] per segment, max 5 segments, separated by /. " +
                "Examples: 'my-page', 'landing/client-x'.",
            },
            html: { type: "string", description: "Complete HTML document to publish." },
          },
        },
      },
      {
        name: "get_page_meta",
        description: "Get metadata (public URL, last updated) for a published page.",
        inputSchema: {
          type: "object",
          required: ["path"],
          properties: {
            path: { type: "string", description: "URL path of the page." },
          },
        },
      },
      {
        name: "delete_page",
        description: "Delete a published HTML page.",
        inputSchema: {
          type: "object",
          required: ["path"],
          properties: {
            path: { type: "string", description: "URL path of the page to delete." },
          },
        },
      },
      {
        name: "list_pages",
        description: "List all published pages with their public URLs and last-updated timestamps.",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;

    function parse_path(raw: unknown) {
      if (typeof raw !== "string" || !raw) throw new Error("'path' must be a non-empty string");
      return normalize_path(raw);
    }

    function err(msg: string) {
      return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
    }

    function ok(data: unknown) {
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }

    switch (name) {
      case "publish_page": {
        const { path: raw_path, html } = args as { path: unknown; html: unknown };
        if (typeof html !== "string" || !html.trim()) return err("'html' must be a non-empty string");
        let page_path: string;
        try { page_path = parse_path(raw_path); }
        catch (e) { return err(e instanceof Error ? e.message : "Invalid path"); }
        const bytes = Buffer.byteLength(html, "utf-8");
        if (bytes > config.max_html_bytes) {
          return err(`HTML exceeds the ${(config.max_html_bytes / 1024 / 1024).toFixed(1)} MB limit`);
        }
        await storage.write(page_path, html);
        return ok({ success: true, url: `${config.public_base_url}/${page_path}`, path: page_path });
      }

      case "get_page_meta": {
        let page_path: string;
        try { page_path = parse_path((args as { path: unknown }).path); }
        catch (e) { return err(e instanceof Error ? e.message : "Invalid path"); }
        const meta = await storage.stat(page_path);
        if (!meta) return err(`Page '${page_path}' not found`);
        return ok({ ...meta, url: `${config.public_base_url}/${page_path}` });
      }

      case "delete_page": {
        let page_path: string;
        try { page_path = parse_path((args as { path: unknown }).path); }
        catch (e) { return err(e instanceof Error ? e.message : "Invalid path"); }
        const existed = await storage.remove(page_path);
        if (!existed) return err(`Page '${page_path}' not found`);
        return ok({ success: true, path: page_path });
      }

      case "list_pages": {
        const pages = await storage.list();
        return ok(pages.map((p) => ({ ...p, url: `${config.public_base_url}/${p.path}` })));
      }

      default:
        return err(`Unknown tool: ${name}`);
    }
  });

  return server;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /mcp — SSE connection (mcp-remote connects here)
mcp_router.get("/", require_api_key, (c) => {
  const session_id = randomUUID();

  return streamSSE(c, async (stream) => {
    const transport = new SseTransport(async (msg) => {
      await stream.writeSSE({ event: "message", data: JSON.stringify(msg) });
    });

    sessions.set(session_id, transport);

    // Tell mcp-remote where to POST messages
    await stream.writeSSE({
      event: "endpoint",
      data: `/mcp/message?sessionId=${session_id}`,
    });

    const server = build_mcp_server();
    await server.connect(transport);

    // Keep alive until client disconnects
    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        sessions.delete(session_id);
        transport.close();
        resolve();
      });

      const ping = setInterval(async () => {
        try {
          await stream.writeSSE({ event: "ping", data: "" });
        } catch {
          clearInterval(ping);
          resolve();
        }
      }, 30_000);
    });
  });
});

// POST /mcp/message — receive messages from mcp-remote
mcp_router.post("/message", require_api_key, async (c) => {
  const session_id = c.req.query("sessionId");
  if (!session_id) return c.json({ error: "Missing sessionId" }, 400);

  const transport = sessions.get(session_id);
  if (!transport) return c.json({ error: "Session not found or expired" }, 404);

  let body: JSONRPCMessage;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  transport.receive(body);
  return new Response(null, { status: 202 });
});
