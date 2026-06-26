import fs from "node:fs/promises";
import path from "node:path";
import type { StorageDriver, PageMeta } from "./types.js";

export class LocalStorage implements StorageDriver {
  private root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private html_path(page_path: string): string {
    // page_path is already normalized (no ".." etc.)
    return path.join(this.root, "pages", ...page_path.split("/")) + ".html";
  }

  private meta_path(page_path: string): string {
    return path.join(this.root, "meta", ...page_path.split("/")) + ".json";
  }

  async write(page_path: string, html: string): Promise<void> {
    const hp = this.html_path(page_path);
    const mp = this.meta_path(page_path);
    await fs.mkdir(path.dirname(hp), { recursive: true });
    await fs.mkdir(path.dirname(mp), { recursive: true });
    await fs.writeFile(hp, html, "utf-8");
    const meta: PageMeta = { path: page_path, updated_at: new Date().toISOString() };
    await fs.writeFile(mp, JSON.stringify(meta), "utf-8");
  }

  async read(page_path: string): Promise<string | null> {
    try {
      return await fs.readFile(this.html_path(page_path), "utf-8");
    } catch {
      return null;
    }
  }

  async stat(page_path: string): Promise<PageMeta | null> {
    try {
      const raw = await fs.readFile(this.meta_path(page_path), "utf-8");
      return JSON.parse(raw) as PageMeta;
    } catch {
      return null;
    }
  }

  async remove(page_path: string): Promise<boolean> {
    const hp = this.html_path(page_path);
    const mp = this.meta_path(page_path);
    try {
      await fs.unlink(hp);
      await fs.unlink(mp).catch(() => undefined);
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<PageMeta[]> {
    const meta_root = path.join(this.root, "meta");
    const results: PageMeta[] = [];
    try {
      await this.walk(meta_root, meta_root, results);
    } catch {
      // meta dir doesn't exist yet
    }
    return results;
  }

  private async walk(base: string, dir: string, out: PageMeta[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.walk(base, full, out);
      } else if (entry.name.endsWith(".json")) {
        try {
          const raw = await fs.readFile(full, "utf-8");
          out.push(JSON.parse(raw) as PageMeta);
        } catch {}
      }
    }
  }
}
