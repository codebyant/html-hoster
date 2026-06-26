import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import { config } from "../config.js";

export const docs_router = new Hono();

function build_spec() {
  const base = config.public_base_url;

  return {
    openapi: "3.1.0",
    info: {
      title: "html-hoster",
      version: "1.0.0",
      description:
        "Publish static HTML pages via API and serve them publicly at a chosen URL path.",
    },
    servers: [{ url: base, description: "Current server" }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "API key defined in the `API_KEY` environment variable.",
        },
      },
      schemas: {
        PublishBody: {
          type: "object",
          required: ["html"],
          properties: {
            html: {
              type: "string",
              description: "Full HTML document to publish.",
              example:
                "<!DOCTYPE html><html><head><title>My Page</title></head><body><h1>Hello</h1></body></html>",
            },
          },
        },
        PublishResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            url: { type: "string", example: `${base}/my-page` },
            path: { type: "string", example: "my-page" },
          },
        },
        MetaResponse: {
          type: "object",
          properties: {
            path: { type: "string", example: "my-page" },
            url: { type: "string", example: `${base}/my-page` },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2024-06-25T12:00:00.000Z",
            },
          },
        },
        DeleteResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            path: { type: "string", example: "my-page" },
          },
        },
        ListResponse: {
          type: "object",
          properties: {
            pages: {
              type: "array",
              items: { $ref: "#/components/schemas/MetaResponse" },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "Page not found" },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    paths: {
      "/api/pages": {
        get: {
          summary: "List all published pages",
          description: "Returns every published page with its public URL and last-updated timestamp.",
          operationId: "listPages",
          security: [{ BearerAuth: [] }],
          responses: {
            "200": {
              description: "List of published pages.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ListResponse" },
                },
              },
            },
            "401": {
              description: "Missing or invalid API key.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/pages/{path}": {
        parameters: [
          {
            name: "path",
            in: "path",
            required: true,
            schema: { type: "string" },
            description:
              "Normalized page path. Segments separated by `/`. Only `[a-zA-Z0-9_-]` allowed per segment. Max 5 segments. Cannot start with `api`.",
            example: "my-page",
          },
        ],
        put: {
          summary: "Publish or update a page",
          description:
            "Creates the page if it does not exist, or replaces its content if it does.",
          operationId: "putPage",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PublishBody" },
              },
            },
          },
          responses: {
            "200": {
              description: "Page published successfully.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PublishResponse" },
                },
              },
            },
            "400": {
              description: "Invalid path or missing/invalid `html` field.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "401": {
              description: "Missing or invalid API key.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "413": {
              description: "HTML payload exceeds `MAX_HTML_SIZE_MB` limit.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
        post: {
          summary: "Upload HTML file (multipart)",
          description:
            "Publishes or replaces a page by uploading an HTML file via `multipart/form-data`. Use the field name `file`.",
          operationId: "uploadPage",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file"],
                  properties: {
                    file: {
                      type: "string",
                      format: "binary",
                      description: "HTML file to publish.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Page published successfully.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PublishResponse" },
                },
              },
            },
            "400": {
              description: "Invalid path, missing file field, or empty file.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "401": {
              description: "Missing or invalid API key.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "413": {
              description: "HTML file exceeds `MAX_HTML_SIZE_MB` limit.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
        get: {
          summary: "Get page metadata",
          description: "Returns metadata (path, public URL, last updated) for a published page.",
          operationId: "getPageMeta",
          security: [{ BearerAuth: [] }],
          responses: {
            "200": {
              description: "Page metadata.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/MetaResponse" },
                },
              },
            },
            "400": {
              description: "Invalid path.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "401": {
              description: "Missing or invalid API key.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "404": {
              description: "Page not found.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
        delete: {
          summary: "Delete a page",
          description: "Removes the published page and its metadata.",
          operationId: "deletePage",
          security: [{ BearerAuth: [] }],
          responses: {
            "200": {
              description: "Page deleted successfully.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/DeleteResponse" },
                },
              },
            },
            "400": {
              description: "Invalid path.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "401": {
              description: "Missing or invalid API key.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "404": {
              description: "Page not found.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/{path}": {
        parameters: [
          {
            name: "path",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Public page path.",
            example: "my-page",
          },
        ],
        get: {
          summary: "Serve a published page",
          description:
            "Returns the raw HTML for the published page. No authentication required.",
          operationId: "servePage",
          security: [],
          responses: {
            "200": {
              description: "HTML content of the page.",
              content: {
                "text/html": {
                  schema: { type: "string" },
                },
              },
            },
            "404": {
              description: "Page not found.",
              content: {
                "text/plain": {
                  schema: { type: "string", example: "404 — page not found" },
                },
              },
            },
          },
        },
      },
    },
  };
}


// Serve OpenAPI JSON spec
docs_router.get("/openapi.json", (c) => {
  return c.json(build_spec());
});

// Serve Swagger UI
docs_router.get("/", swaggerUI({ url: "/api/docs/openapi.json" }));
