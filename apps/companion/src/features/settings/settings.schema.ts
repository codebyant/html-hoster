import { z } from "zod";

export const afterUploadActionSchema = z.enum(["open", "copy", "nothing"]);
export type AfterUploadAction = z.infer<typeof afterUploadActionSchema>;

export const settingsSchema = z.object({
  api_url: z.string().default(""),
  onboarding_completed: z.boolean().default(false),
  api_key_stored: z.boolean().default(false),
  after_upload_action: afterUploadActionSchema.default("copy"),
  notifications_enabled: z.boolean().default(true),
  autostart_enabled: z.boolean().default(false),
  global_shortcut: z.string().default(""),
  language: z.string().default(""),
});

export type Settings = z.infer<typeof settingsSchema>;
