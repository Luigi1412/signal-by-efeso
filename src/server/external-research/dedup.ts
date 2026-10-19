import { normalizeUrl } from "./normalize";
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
