const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "metadata.internal"]);

export function assertSafeHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("INVALID_URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("BLOCKED_PROTOCOL");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("BLOCKED_HOST");
  }
  if (isPrivateOrMetadataAddress(host)) {
    throw new Error("BLOCKED_PRIVATE_ADDRESS");
  }
  return url;
}

export function isPrivateOrMetadataAddress(host: string): boolean {
  if (host === "::1" || host === "0.0.0.0") return true;
  if (host === "169.254.169.254") return true;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export const ALLOWED_FETCH_MIME = new Set([
  "text/html",
  "text/plain",
  "application/pdf",
  "application/xhtml+xml",
  "application/xml",
  "text/xml",
]);

export function isAllowedMime(value: string | null): boolean {
  if (!value) return false;
  const mime = value.split(";")[0]?.trim().toLowerCase() ?? "";
  return ALLOWED_FETCH_MIME.has(mime);
}

export function looksLikeLoginOrPaywall(html: string, status: number): boolean {
  if (status === 401 || status === 402 || status === 403) return true;
  const sample = html.slice(0, 4000).toLowerCase();
  return (
    sample.includes("paywall") ||
    sample.includes("subscribe to continue") ||
    /name="password"/.test(sample) ||
    sample.includes("sign in to continue")
  );
}
