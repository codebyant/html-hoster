import { config } from "../config.js";
import { LocalStorage } from "./local.js";
import { S3Storage } from "./s3.js";
import { DemoStorage } from "./demo.js";
import type { StorageDriver } from "./types.js";

export function create_storage(): StorageDriver {
  if (config.demo_mode) return new DemoStorage();
  if (config.storage_driver === "s3") {
    if (!config.s3.bucket) throw new Error("S3_BUCKET is required when STORAGE_DRIVER=s3");
    return new S3Storage(config.s3);
  }
  return new LocalStorage(config.local_storage_dir);
}

export type { StorageDriver };
