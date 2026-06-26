import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import type { StorageDriver, PageMeta } from "./types.js";

interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  access_key_id: string;
  secret_access_key: string;
}

export class S3Storage implements StorageDriver {
  private client: S3Client;
  private bucket: string;

  constructor(cfg: S3Config) {
    this.bucket = cfg.bucket;
    this.client = new S3Client({
      region: cfg.region,
      ...(cfg.endpoint ? { endpoint: cfg.endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: cfg.access_key_id,
        secretAccessKey: cfg.secret_access_key,
      },
    });
  }

  private html_key(page_path: string): string {
    return `pages/${page_path}.html`;
  }

  private meta_key(page_path: string): string {
    return `meta/${page_path}.json`;
  }

  async write(page_path: string, html: string): Promise<void> {
    const meta: PageMeta = { path: page_path, updated_at: new Date().toISOString() };
    await Promise.all([
      this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.html_key(page_path),
          Body: html,
          ContentType: "text/html; charset=utf-8",
        })
      ),
      this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.meta_key(page_path),
          Body: JSON.stringify(meta),
          ContentType: "application/json",
        })
      ),
    ]);
  }

  async read(page_path: string): Promise<string | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.html_key(page_path) })
      );
      return (await res.Body?.transformToString("utf-8")) ?? null;
    } catch {
      return null;
    }
  }

  async stat(page_path: string): Promise<PageMeta | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.meta_key(page_path) })
      );
      const raw = await res.Body?.transformToString("utf-8");
      if (!raw) return null;
      return JSON.parse(raw) as PageMeta;
    } catch {
      return null;
    }
  }

  async remove(page_path: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.html_key(page_path) })
      );
    } catch {
      return false; // doesn't exist
    }
    await Promise.all([
      this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.html_key(page_path) })),
      this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.meta_key(page_path) })),
    ]);
    return true;
  }

  async list(): Promise<PageMeta[]> {
    const results: PageMeta[] = [];
    let token: string | undefined;
    do {
      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: "meta/",
          ContinuationToken: token,
        })
      );
      for (const obj of res.Contents ?? []) {
        if (!obj.Key?.endsWith(".json")) continue;
        try {
          const file = await this.client.send(
            new GetObjectCommand({ Bucket: this.bucket, Key: obj.Key })
          );
          const raw = await file.Body?.transformToString("utf-8");
          if (raw) results.push(JSON.parse(raw) as PageMeta);
        } catch {}
      }
      token = res.NextContinuationToken;
    } while (token);
    return results;
  }
}
