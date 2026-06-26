type AppEnv = "development" | "demo" | "production";

function require_env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const app_env = (process.env.APP_ENV ?? "production") as AppEnv;

export const config = {
  app_env,
  swagger_enabled: app_env === "development" || app_env === "demo",
  demo_mode: app_env === "demo",
  api_key: require_env("API_KEY"),
  public_base_url: (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  port: parseInt(process.env.PORT ?? "3000", 10),
  storage_driver: (process.env.STORAGE_DRIVER ?? "local") as "local" | "s3",
  local_storage_dir: process.env.LOCAL_STORAGE_DIR ?? "./data",
  max_html_bytes: parseFloat(process.env.MAX_HTML_SIZE_MB ?? "5") * 1024 * 1024,
  root_redirect: process.env.ROOT_REDIRECT?.replace(/\/$/, "") || null,
  landing_disabled: process.env.DISABLE_LANDING === "true",
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "us-east-1",
    bucket: process.env.S3_BUCKET ?? "",
    access_key_id: process.env.S3_ACCESS_KEY_ID ?? "",
    secret_access_key: process.env.S3_SECRET_ACCESS_KEY ?? "",
    public_url: (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, ""),
  },
};
