import ky, { type KyInstance } from "ky";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { ApiError, ConfigError } from "./errors";

let _client: KyInstance | null = null;
let _clientUrl: string | null = null;

export async function getApiClient(): Promise<KyInstance> {
  const store = await load("settings.json", { defaults: {} });
  const apiUrl = await store.get<string>("api_url");
  if (!apiUrl) throw new ConfigError("API URL not configured");

  const normalized = normalizeApiUrl(apiUrl) + "/";

  if (normalized === _clientUrl && _client) return _client;

  _clientUrl = normalized;
  _client = ky.create({
    prefixUrl: normalized,
    fetch: tauriFetch as typeof fetch,
    retry: 0,
    timeout: 30_000,
    hooks: {
      beforeRequest: [
        async (request) => {
          const apiKey = await invoke<string | null>("get_api_key");
          if (!apiKey) throw new ConfigError("API key not configured");
          request.headers.set("Authorization", `Bearer ${apiKey}`);
        },
      ],
      afterResponse: [
        async (_req, _opts, response) => {
          if (!response.ok) {
            let message = `Request failed (${response.status})`;
            try {
              const body = await response.clone().json() as { error?: string };
              if (body.error) message = body.error;
            } catch {
              // ignore parse error
            }
            throw new ApiError(response.status, message);
          }
        },
      ],
    },
  });

  return _client;
}

export async function getServerConfig(): Promise<{ max_file_size_mb: number; base_url: string }> {
  const client = await getApiClient();
  return client.get("api/config").json();
}

export function invalidateApiClient() {
  _client = null;
  _clientUrl = null;
}

/** Normalize API URL: strip trailing /pages, /pages/, etc. and trailing slash */
function normalizeApiUrl(apiUrl: string): string {
  return apiUrl.trim().replace(/\/pages\/?$/, "").replace(/\/$/, "");
}

/**
 * Test connection by hitting GET {apiUrl}/pages without auth.
 * A 401/403 response means the server is up (just unauthenticated — that's fine).
 * A network exception means unreachable.
 */
export async function testConnection(
  apiUrl: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const base = normalizeApiUrl(apiUrl);
    const res = await (tauriFetch as typeof fetch)(`${base}/pages`, {
      method: "GET",
    });
    // 401/403 = server up, just no auth — good enough
    if (res.status === 401 || res.status === 403 || res.ok) {
      return { ok: true };
    }
    return { ok: false, error: `Server returned ${res.status}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return { ok: false, error: msg };
  }
}

/** Test auth by calling GET {apiUrl}/pages with Bearer token */
export async function testAuth(
  apiUrl: string,
  apiKey: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const base = normalizeApiUrl(apiUrl);
    const res = await (tauriFetch as typeof fetch)(`${base}/pages`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "Invalid API key" };
    if (!res.ok)
      return { ok: false, error: `Server returned ${res.status}` };
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auth test failed";
    return { ok: false, error: msg };
  }
}
