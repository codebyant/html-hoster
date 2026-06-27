import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { getApiClient } from "../../shared/api/client";
import { pagesResponseSchema, type Page } from "./pages.schema";
import { pathToSegment } from "../../shared/lib/validation";

export async function listPages(): Promise<Page[]> {
  const api = await getApiClient();
  const raw = await api.get("pages").json();
  return pagesResponseSchema.parse(raw).pages;
}

export async function uploadPage(path: string, file: File): Promise<{ url: string; path: string }> {
  const api = await getApiClient();
  const segment = pathToSegment(path);
  const form = new FormData();
  form.append("file", file);
  const raw = await api.post(`pages/${segment}`, { body: form }).json();
  return raw as { url: string; path: string };
}

export async function deletePage(path: string): Promise<void> {
  const api = await getApiClient();
  const segment = pathToSegment(path);
  await api.delete(`pages/${segment}`);
}

/**
 * Rename: fetch HTML from public URL, POST to new path, DELETE old path.
 * The public URL comes from the page's url field (no auth needed for reading).
 */
export async function renamePage(
  oldPath: string,
  newPath: string,
  publicUrl: string
): Promise<{ url: string; path: string }> {
  // Fetch the HTML from the public URL (no auth)
  const res = await (tauriFetch as typeof fetch)(publicUrl, { method: "GET" });
  if (!res.ok) throw new Error(`Could not fetch existing page HTML (${res.status})`);
  const html = await res.text();

  // Upload to new path as JSON
  const api = await getApiClient();
  const newSegment = pathToSegment(newPath);
  const result = await api
    .put(`pages/${newSegment}`, { json: { html } })
    .json() as { url: string; path: string };

  // Delete old path
  const oldSegment = pathToSegment(oldPath);
  await api.delete(`pages/${oldSegment}`);

  return result;
}
