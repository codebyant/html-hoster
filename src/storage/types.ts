export interface PageMeta {
  path: string;
  updated_at: string;
}

export interface StorageDriver {
  /** Write HTML content for the given normalized path. */
  write(path: string, html: string): Promise<void>;

  /** Read HTML for the given normalized path. Returns null if not found. */
  read(path: string): Promise<string | null>;

  /** Return metadata, or null if not found. */
  stat(path: string): Promise<PageMeta | null>;

  /** Delete page. Returns true if it existed. */
  remove(path: string): Promise<boolean>;

  /** List all published pages. */
  list(): Promise<PageMeta[]>;
}
