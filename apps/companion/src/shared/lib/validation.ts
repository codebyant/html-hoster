import { z } from "zod";
import i18next from "./i18n";

/** Max HTML file size: 5 MB (matches server default) */
export const MAX_HTML_BYTES = 5 * 1024 * 1024;

const t = () => i18next.t.bind(i18next);

/**
 * Page path validation — mirrors server-side rules in src/utils/path.ts:
 *  - Must start with /
 *  - Each segment: alphanumeric, hyphens, underscores only
 *  - Max 5 segments
 *  - Cannot start with /api
 *  - No .., //, or spaces
 */
export function pathSchema() {
  const tr = t();
  return z
    .string()
    .min(1, tr("validation.pathRequired"))
    .regex(/^\//, tr("validation.pathMustStartWithSlash"))
    .refine((s) => !s.includes(".."), tr("validation.pathTraversal"))
    .refine((s) => !s.includes("//"), tr("validation.doubleSlashes"))
    .refine((s) => !/\s/.test(s), tr("validation.pathNoSpaces"))
    .refine(
      (s) => /^\/[a-zA-Z0-9/_-]+$/.test(s),
      tr("validation.pathInvalidChars")
    )
    .refine(
      (s) => s.replace(/^\//, "").split("/").length <= 5,
      tr("validation.pathMaxSegments")
    )
    .refine(
      (s) => !s.replace(/^\//, "").toLowerCase().startsWith("api"),
      tr("validation.pathReserved")
    );
}

export function apiUrlSchema() {
  const tr = t();
  return z
    .string()
    .min(1, tr("validation.apiUrlRequired"))
    .url(tr("validation.apiUrlInvalid"));
}

export function apiKeySchema() {
  const tr = t();
  return z.string().min(1, tr("validation.apiKeyRequired"));
}

/** Convert user-entered path (/foo/bar) to API URL segment (foo/bar) */
export function pathToSegment(path: string): string {
  return path.replace(/^\//, "");
}
