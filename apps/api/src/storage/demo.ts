import type { StorageDriver, PageMeta } from "./types.js";

/** No-op storage used in demo mode. Reads return null; writes are silently discarded. */
export class DemoStorage implements StorageDriver {
  async write(_path: string, _html: string): Promise<void> {}
  async read(_path: string): Promise<string | null> { return null; }
  async stat(_path: string): Promise<PageMeta | null> { return null; }
  async remove(_path: string): Promise<boolean> { return false; }
  async list(): Promise<PageMeta[]> { return []; }
}
