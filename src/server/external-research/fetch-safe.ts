import { getExternalResearchLimits } from "./config";
import { ALLOWED_FETCH_MIME, assertSafeHttpUrl, isAllowedMime, isPrivateOrMetadataAddress, looksLikeLoginOrPaywall } from "./ssrf";

export type LookupFn = (hostname: string) => Promise<string[]>;
export type FetchFn = typeof fetch;

export class UnsafeFetchError extends Error {
  constructor(
    readonly code: "BLOCKED_PROTOCOL" | "BLOCKED_HOST" | "BLOCKED_PRIVATE_ADDRESS" | "TOO_MANY_REDIRECTS" | "TIMEOUT" | "TOO_LARGE" | "UNSUPPORTED_MIME" | "UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "UnsafeFetchError";
  }
}

export async function safeFetch(input: {
  url: string;
  fetchImpl?: FetchFn;
  lookup?: LookupFn;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
}): Promise<{ url: string; status: number; mimeType: string; bytes: Uint8Array }> {
  const limits = getExternalResearchLimits();
  const maxRedirects = input.maxRedirects ?? limits.maxRedirects;
  const maxBytes = input.maxBytes ?? limits.maxBytesPerSource;
  const timeoutMs = input.timeoutMs ?? limits.fetchTimeoutMs;
  const fetchImpl = input.fetchImpl ?? fetch;

  let current = assertSafeHttpUrl(input.url).toString();
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const parsed = assertSafeHttpUrl(current);
    if (input.lookup) {
      const addresses = await input.lookup(parsed.hostname);
      if (addresses.some(isPrivateOrMetadataAddress)) {
        throw new UnsafeFetchError("BLOCKED_PRIVATE_ADDRESS", "Redirect resolved to a private address.");
      }
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: [...ALLOWED_FETCH_MIME].join(", ") },
      });
    } catch (error) {
      if (error instanceof UnsafeFetchError) throw error;
      throw new UnsafeFetchError("TIMEOUT", "Fetch timed out or failed.");
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new UnsafeFetchError("UNAVAILABLE", "Redirect without location.");
      current = new URL(location, current).toString();
      if (hop === maxRedirects) throw new UnsafeFetchError("TOO_MANY_REDIRECTS", "Too many redirects.");
      continue;
    }

    const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!isAllowedMime(mimeType)) {
      throw new UnsafeFetchError("UNSUPPORTED_MIME", `Unsupported content type: ${mimeType || "unknown"}`);
    }
    const length = Number(response.headers.get("content-length") ?? "0");
    if (length > maxBytes) throw new UnsafeFetchError("TOO_LARGE", "Response exceeds byte limit.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new UnsafeFetchError("TOO_LARGE", "Response exceeds byte limit.");
    if (looksLikeLoginOrPaywall(new TextDecoder().decode(bytes.slice(0, 8000)), response.status)) {
      throw new UnsafeFetchError("UNAVAILABLE", "Source requires login or is paywalled.");
    }
    if (!response.ok) throw new UnsafeFetchError("UNAVAILABLE", `HTTP ${response.status}`);
    return { url: current, status: response.status, mimeType, bytes };
  }
  throw new UnsafeFetchError("TOO_MANY_REDIRECTS", "Too many redirects.");
}
