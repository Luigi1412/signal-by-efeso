import { lookup as dnsLookup } from "node:dns";
import { promisify } from "node:util";
import { isIP, type LookupFunction } from "node:net";
import { Agent, fetch as pinnedFetch } from "undici";
import { getExternalResearchLimits } from "./config";
import { abortable, countResearch, researchSignal, researchRuntime } from "./runtime";
import { ALLOWED_FETCH_MIME, assertSafeHttpUrl, isAllowedMime, isPrivateOrMetadataAddress, looksLikeLoginOrPaywall } from "./ssrf";

export type LookupFn = (hostname: string) => Promise<string[]>;
export type FetchFn = typeof fetch;
export class UnsafeFetchError extends Error {
  constructor(readonly code: "BLOCKED_PROTOCOL" | "BLOCKED_HOST" | "BLOCKED_PRIVATE_ADDRESS" | "TOO_MANY_REDIRECTS" | "TIMEOUT" | "TOO_LARGE" | "UNSUPPORTED_MIME" | "UNAVAILABLE", message: string) {
    super(message); this.name = "UnsafeFetchError";
  }
}
export const lookupPublicAddresses: LookupFn = async (hostname) => {
  if (isIP(hostname)) return [hostname];
  return (await promisify(dnsLookup)(hostname, { all: true, verbatim: true })).map((row) => row.address);
};

export async function safeFetch(input: {
  url: string; fetchImpl?: FetchFn; lookup?: LookupFn; maxBytes?: number;
  timeoutMs?: number; maxRedirects?: number; signal?: AbortSignal;
}): Promise<{ url: string; status: number; mimeType: string; bytes: Uint8Array }> {
  const limits = getExternalResearchLimits();
  const remaining = limits.maxTotalBytes - (researchRuntime.getStore()?.counters.downloadBytes ?? 0);
  const maxBytes = Math.min(input.maxBytes ?? limits.maxBytesPerSource, remaining);
  if (maxBytes <= 0) throw new UnsafeFetchError("TOO_LARGE", "Research download budget exhausted.");
  const controller = new AbortController();
  const parent = input.signal ?? researchSignal();
  const signal = parent ? AbortSignal.any([parent, controller.signal]) : controller.signal;
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? limits.fetchTimeoutMs);
  let current = assertSafeHttpUrl(input.url).toString();
  try {
    for (let hop = 0; hop <= (input.maxRedirects ?? limits.maxRedirects); hop++) {
      signal.throwIfAborted();
      const parsed = assertSafeHttpUrl(current);
      const host = parsed.hostname.replace(/^\[|\]$/g, "");
      const addresses = await abortable((input.lookup ?? lookupPublicAddresses)(host), signal);
      if (addresses.length === 0 || addresses.some((address) => !isIP(address) || isPrivateOrMetadataAddress(address))) {
        throw new UnsafeFetchError("BLOCKED_PRIVATE_ADDRESS", "Source DNS did not resolve exclusively to public addresses.");
      }
      // Pin DNS-approved addresses at connection time, preventing a second untrusted resolution.
      const lookup: LookupFunction = (_hostname, options, callback) => {
        const records = addresses.map((address) => ({ address, family: isIP(address) }));
        if (options.all) callback(null, records);
        else callback(null, records[0]!.address, records[0]!.family);
      };
      const dispatcher = input.fetchImpl ? null : new Agent({ connect: { lookup } });
      let response: Response | undefined;
      try {
        const fetchImpl = input.fetchImpl ?? pinnedFetch as unknown as FetchFn;
        const init = { method: "GET", redirect: "manual" as const, signal,
          headers: { Accept: [...ALLOWED_FETCH_MIME].join(", ") }, ...(dispatcher ? { dispatcher } : {}) };
        response = await abortable(fetchImpl(current, init), signal);
        if ([301,302,303,307,308].includes(response.status)) {
          const location = response.headers.get("location");
          if (!location) throw new UnsafeFetchError("UNAVAILABLE", "Redirect without location.");
          current = new URL(location, current).toString();
          continue;
        }
        const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
        if (!isAllowedMime(mimeType)) throw new UnsafeFetchError("UNSUPPORTED_MIME", "Unsupported source type.");
        if (!response.ok) throw new UnsafeFetchError("UNAVAILABLE", `HTTP ${response.status}`);
        if (Number(response.headers.get("content-length") ?? 0) > maxBytes) throw new UnsafeFetchError("TOO_LARGE", "Source exceeds byte budget.");
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        if (reader) {
          try {
            while (true) {
              const next = await abortable(reader.read(), signal);
              if (next.done) break;
              size += next.value.byteLength;
              countResearch("downloadBytes",next.value.byteLength);
              if (size > maxBytes || (researchRuntime.getStore()?.counters.downloadBytes ?? 0) > limits.maxTotalBytes) throw new UnsafeFetchError("TOO_LARGE", "Source exceeds byte budget.");
              chunks.push(next.value);
            }
          } finally { void reader.cancel().catch(() => {}); reader.releaseLock(); }
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        if (looksLikeLoginOrPaywall(new TextDecoder().decode(bytes.slice(0,8000)), response.status)) {
          throw new UnsafeFetchError("UNAVAILABLE", "Source requires login or is paywalled.");
        }
        countResearch("urlsFetched");
        return { url: current, status: response.status, mimeType, bytes };
      } finally {
        if (response?.body && !response.body.locked) void response.body.cancel().catch(() => {});
        if (dispatcher) await dispatcher.destroy();
      }
    }
    throw new UnsafeFetchError("TOO_MANY_REDIRECTS", "Too many redirects.");
  } catch (error) {
    if (parent?.aborted) throw parent.reason;
    if (signal.aborted) throw new UnsafeFetchError("TIMEOUT", "Source deadline exceeded.");
    throw error;
  } finally { clearTimeout(timer); }
}
