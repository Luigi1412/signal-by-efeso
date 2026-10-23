/** Only same-origin path references. Reject network paths, backslashes and controls. */
export function safeLocalRedirect(value: string | null | undefined, fallback = "/companies"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded)) return fallback;
    const base = "https://signal.invalid";
    const parsed = new URL(value, base);
    return parsed.origin === base ? parsed.pathname + parsed.search + parsed.hash : fallback;
  } catch { return fallback; }
}
