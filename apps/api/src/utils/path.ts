const SAFE_SEGMENT = /^[a-zA-Z0-9_\-]+$/;

/**
 * Validates and normalizes a public page path.
 * Returns the clean path string, or throws with a descriptive message.
 *
 * Rules:
 *  - No empty segments
 *  - Each segment: alphanumeric, hyphens, underscores only
 *  - Max 5 segments deep
 *  - Cannot start with "api" (reserved)
 */
export function normalize_path(raw: string): string {
  if (!raw || typeof raw !== "string") {
    throw new PathError("Path must be a non-empty string");
  }

  // Strip leading/trailing slashes and collapse duplicates
  const cleaned = raw.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");

  if (!cleaned) {
    throw new PathError("Path is empty after normalization");
  }

  const segments = cleaned.split("/");

  if (segments.length > 5) {
    throw new PathError("Path too deep (max 5 segments)");
  }

  for (const seg of segments) {
    if (!seg) throw new PathError("Path contains empty segment");
    if (seg === "." || seg === "..") throw new PathError("Path traversal not allowed");
    if (!SAFE_SEGMENT.test(seg)) {
      throw new PathError(`Invalid characters in segment: "${seg}"`);
    }
  }

  if (segments[0].toLowerCase() === "api") {
    throw new PathError('Path cannot start with "api" (reserved)');
  }

  return cleaned;
}

export class PathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathError";
  }
}
