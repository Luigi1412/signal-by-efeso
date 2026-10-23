import ipaddr from "ipaddr.js";
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
  if (url.username || url.password) throw new Error("BLOCKED_HOST");
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
  const address = host.replace(/^\[|\]$/g, "");
  if (!ipaddr.isValid(address)) return false;
  // Includes IPv4-mapped IPv6, ULA, link-local, multicast, reserved and transition ranges.
  return ipaddr.process(address).range() !== "unicast";
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
