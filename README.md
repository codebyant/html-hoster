# html-hoster

Publish static HTML pages via REST API or AI agent. Send HTML, get a public URL — no CMS, no dashboard, no deploy pipeline.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/S3ggQm?referralCode=EeixAa&utm_medium=integration&utm_source=template&utm_campaign=generic)

```bash
curl -X PUT https://html.yoursite.com/api/pages/hello \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Hello world</h1>"}'
# → { "url": "https://html.yoursite.com/hello" }
```

---

## Quick start

```bash
cp .env.example .env
# set API_KEY and PUBLIC_BASE_URL at minimum
bun install
bun run dev
```

The server starts at `http://localhost:3000`. Swagger UI available at `/api/docs` in `development` and `demo` modes.

---

## API

All write routes require `Authorization: Bearer <API_KEY>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/pages` | yes | List all published pages |
| `PUT` | `/api/pages/:path` | yes | Publish or update a page (JSON body) |
| `POST` | `/api/pages/:path` | yes | Publish via file upload (multipart) |
| `GET` | `/api/pages/:path` | yes | Get page metadata |
| `DELETE` | `/api/pages/:path` | yes | Delete a page |
| `GET` | `/:path` | no | Serve published page publicly |

### Publish a page

```bash
curl -X PUT http://localhost:3000/api/pages/my-page \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"html": "<!DOCTYPE html><html><body><h1>Hello</h1></body></html>"}'
```

```json
{ "success": true, "url": "https://html.yoursite.com/my-page", "path": "my-page" }
```

### Upload an HTML file

```bash
curl -X POST http://localhost:3000/api/pages/my-page \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@page.html"
```

### Get metadata

```bash
curl http://localhost:3000/api/pages/my-page \
  -H "Authorization: Bearer $API_KEY"
```

```json
{ "path": "my-page", "url": "https://html.yoursite.com/my-page", "updated_at": "2025-01-01T00:00:00.000Z" }
```

### Delete

```bash
curl -X DELETE http://localhost:3000/api/pages/my-page \
  -H "Authorization: Bearer $API_KEY"
```

### Path rules

Segments: `[a-zA-Z0-9_-]` only, max 5 levels deep, cannot start with `api`.

Valid: `my-page`, `docs/getting-started`, `campaigns/2025/hero`  
Invalid: `../etc/passwd`, `api/anything`, `my page` (space), `page.html` (dot)

---

## MCP (AI agent integration)

html-hoster ships a native MCP server. Claude Desktop, Claude Code, Cursor, and any compatible agent can call `publish_page`, `get_page_meta`, `delete_page`, and `list_pages` as native tools.

### Configure Claude Desktop or Claude Code

The MCP server runs inside the HTTP server at `/mcp`. Connect via `mcp-remote`:

```json
{
  "mcpServers": {
    "html-hoster": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://html.yoursite.com/mcp",
        "--header",
        "Authorization:${HTML_HOSTER_AUTH}"
      ],
      "env": {
        "HTML_HOSTER_AUTH": "Bearer your-api-key"
      }
    }
  }
}
```

For local development, replace the URL with `http://localhost:3000/mcp`.

### Available tools

| Tool | Description |
|------|-------------|
| `publish_page` | Publish or replace a page (`path` + `html`) |
| `get_page_meta` | Get URL and last-updated timestamp |
| `delete_page` | Remove a published page |
| `list_pages` | List all published pages with URLs |

### Test the MCP endpoint

With the server running, connect directly:

```bash
curl -N -H "Authorization: Bearer $API_KEY" \
  -H "Accept: text/event-stream" \
  http://localhost:3000/mcp
```

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_KEY` | yes | — | Bearer token for all write routes |
| `PUBLIC_BASE_URL` | yes | `http://localhost:3000` | Base URL returned in responses |
| `APP_ENV` | no | `production` | `development` · `demo` · `production` |
| `STORAGE_DRIVER` | no | `local` | `local` or `s3` |
| `LOCAL_STORAGE_DIR` | no | `./data` | Directory for local storage |
| `DISABLE_LANDING` | no | `false` | Return 404 for `/` instead of the landing page |
| `ROOT_REDIRECT` | no | — | Redirect `/` to this URL (takes priority over `DISABLE_LANDING`) |
| `MAX_HTML_SIZE_MB` | no | `5` | Max HTML payload in MB |
| `PORT` | no | `3000` | HTTP port |
| `S3_BUCKET` | s3 | — | Bucket name (required for s3) |
| `S3_ACCESS_KEY_ID` | s3 | — | Access key (required for s3) |
| `S3_SECRET_ACCESS_KEY` | s3 | — | Secret key (required for s3) |
| `S3_REGION` | no | `us-east-1` | Bucket region |
| `S3_ENDPOINT` | no | — | Custom endpoint (MinIO, R2, non-AWS) |

### App modes (`APP_ENV`)

| Mode | Swagger | Writes | Storage |
|------|---------|--------|---------|
| `development` | enabled | enabled | local/s3 |
| `demo` | enabled | blocked (403) | no-op |
| `production` | disabled | enabled | local/s3 |

---

## Deploy

### Railway (recommended)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/S3ggQm?referralCode=EeixAa&utm_medium=integration&utm_source=template&utm_campaign=generic)

One-click deploy with the button above, or connect the GitHub repo manually. Set the service **Root Directory** to `apps/api` (it holds `railway.toml` and `nixpacks.toml`). Set the required variables in the dashboard:

```
API_KEY=...
PUBLIC_BASE_URL=https://your-app.up.railway.app
APP_ENV=production
STORAGE_DRIVER=s3   # Railway filesystem is ephemeral — use S3 for persistence
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

### Manual (any host with Bun)

```bash
API_KEY=secret \
PUBLIC_BASE_URL=https://html.yoursite.com \
STORAGE_DRIVER=s3 \
S3_BUCKET=my-pages \
... \
bun run start
```

### Local S3 with MinIO

```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=html-pages
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

---

## Contributing

Contributions are welcome. The project is intentionally small — keep that in mind before proposing new features.

### Setup

```bash
git clone https://github.com/codebyant/html-hoster
cd html-hoster/apps/api
bun install
cp .env.example .env
bun run dev
```

### Project structure

```
apps/api/             # the hosting API (this README)
  src/
    index.ts          # app entry point, route mounting
    config.ts         # env vars, typed config object
    middleware/
      auth.ts         # API key check (Bearer or raw token)
      demo.ts         # blocks writes in demo mode
    routes/
      api.ts          # REST API routes
      docs.ts         # OpenAPI spec + Swagger UI
      mcp_route.ts    # MCP server over SSE (mcp-remote)
      serve.ts        # landing page + public HTML serving
    storage/
      types.ts        # StorageDriver interface
      local.ts        # filesystem implementation
      s3.ts           # S3-compatible implementation
      demo.ts         # no-op implementation for demo mode
      index.ts        # factory (create_storage)
    utils/
      path.ts         # path validation (normalize_path, PathError)
  public/
    index.html        # landing page
    assets/           # static assets (logo, etc.)
    i18n/             # translation files (pt.json, en.json, ...)
apps/companion/       # desktop companion app (Tauri)
```

### Adding a translation

1. Copy `apps/api/public/i18n/en.json` → `apps/api/public/i18n/{lang}.json`
2. Translate all values (keep keys and `_meta.lang` / `_meta.flag` correct)
3. Set `_meta.contributor` to your GitHub username
4. Open a PR — the language switcher picks it up automatically

### Guidelines

- Keep changes minimal and focused — one thing per PR
- No new dependencies without discussion
- TypeScript strict mode is on — no `any`
- New routes go through `normalize_path` for anything user-supplied
- Test the three modes (`development`, `demo`, `production`) if touching startup or middleware

---

## License

MIT — see [LICENSE](LICENSE).  
Made by [Antônio Miranda](https://antmiranda.dev).
