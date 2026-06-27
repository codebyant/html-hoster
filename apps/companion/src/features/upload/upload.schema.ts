import { z } from "zod";
import { pathSchema, MAX_HTML_BYTES } from "../../shared/lib/validation";
import i18next from "../../shared/lib/i18n";

export const uploadFormSchema = z.object({
  path: pathSchema(),
});

export function validateHtmlFile(file: File, maxBytes = MAX_HTML_BYTES): string | null {
  const t = i18next.t.bind(i18next);
  const maxMB = (maxBytes / 1024 / 1024).toFixed(0);
  if (!file.name.endsWith(".html")) return t("fileValidation.onlyHtml");
  if (file.type && file.type !== "text/html") return t("fileValidation.mustBeHtml");
  if (file.size === 0) return t("fileValidation.fileEmpty");
  if (file.size > maxBytes) return t("fileValidation.fileTooLarge", { maxMB });
  return null;
}

export const uploadResponseSchema = z.object({
  success: z.boolean(),
  url: z.string().optional(),
  path: z.string().optional(),
});
