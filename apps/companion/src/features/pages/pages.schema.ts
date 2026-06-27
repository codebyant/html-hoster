import { z } from "zod";

export const pageSchema = z.object({
  path: z.string(),
  url: z.string(),
  updated_at: z.string(),
});

export const pagesResponseSchema = z.object({
  pages: z.array(pageSchema),
});

export type Page = z.infer<typeof pageSchema>;
