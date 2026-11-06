import { hostnameOf, normalizeUrl } from "./normalize";
import type { AssessedSource } from "./types";

export function dedupeSources(items: AssessedSource[]): AssessedSource[] {
  const seenUrl = new Set<string>();
  const seenHash = new Set<string>();
  const seenTitleDate = new Set<string>();
  const result: AssessedSource[] = [];
  for (const item of items) {
    const normalized = normalizeUrl(item.canonicalUrl || item.url);
    if (seenUrl.has(normalized)) continue;
    if (item.contentHash && seenHash.has(item.contentHash)) continue;
    const titleKey = `${(item.title ?? "").trim().toLowerCase()}|${item.publishedAt ?? ""}`;
    if (item.title && item.publishedAt && seenTitleDate.has(titleKey)) continue;
    seenUrl.add(normalized);
    if (item.contentHash) seenHash.add(item.contentHash);
    if (item.title && item.publishedAt) seenTitleDate.add(titleKey);
    result.push({ ...item, normalizedUrl: normalized });
  }
  return result;
}

/**
 * After ranking: drop same-host documents with equivalent titles so duplicates
 * (e.g. two "Executive Corporate Officers' compensation" IR pages) do not consume slots.
 */
export function dedupeEquivalentDocuments(items: AssessedSource[]): AssessedSource[] {
  const seenTitleHost = new Set<string>();
  const result: AssessedSource[] = [];
  for (const item of items) {
    const title = (item.title ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    const host = hostnameOf(item.canonicalUrl || item.url) ?? "";
    if (title && host) {
      const key = `${title}|${host}`;
      if (seenTitleHost.has(key)) continue;
      seenTitleHost.add(key);
    }
    result.push(item);
  }
  return result;
}
