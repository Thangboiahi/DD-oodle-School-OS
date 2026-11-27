const INTERNAL_ORIGIN = "https://dd-oodle.internal";
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/;

/**
 * Validates that a post-auth redirect target is strictly an internal relative path
 * beginning with a single `/` and not targeting protocol-relative URLs, external origins,
 * script schemes, or `/auth/sign-out`.
 */
export function sanitizeNextPath(
  raw: string | null | undefined,
  fallback = "/workspace",
): string {
  if (typeof raw !== "string") {
    return fallback;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return fallback;
  }

  if (CONTROL_CHAR_PATTERN.test(trimmed) || trimmed.includes("\\")) {
    return fallback;
  }

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("/javascript:") ||
    lower.startsWith("/data:") ||
    lower.startsWith("/vbscript:") ||
    lower.startsWith("/http:") ||
    lower.startsWith("/https:")
  ) {
    return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed, INTERNAL_ORIGIN);
  } catch {
    return fallback;
  }

  if (parsed.origin !== INTERNAL_ORIGIN) {
    return fallback;
  }

  if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
    return fallback;
  }

  if (
    parsed.pathname === "/auth/sign-out" ||
    parsed.pathname.startsWith("/auth/sign-out/")
  ) {
    return fallback;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
