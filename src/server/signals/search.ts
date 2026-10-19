import { normalizeSignalText } from "./taxonomy";
import type { SignalListItem, SignalSearchFilters } from "./types";

const IMPORTANCE_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };
const CONFIDENCE_RANK: Record<string, number> = { direct: 3, supported: 2, mixed: 1 };

export function rankSignalSearch(items: SignalListItem[], filters: SignalSearchFilters): SignalListItem[] {
  const status = filters.status ?? "active";
  const query = normalizeSignalText(filters.query?.trim() ?? "");
  const dateFrom = filters.dateFrom ?? null;
  const dateTo = filters.dateTo ?? null;
  const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 50;

  const matched = items.filter((item) => {
    if (item.status !== status) return false;
    if (filters.companyId && item.companyId !== filters.companyId) return false;
    if (filters.signalType && item.signalType !== filters.signalType) return false;
    if (filters.importance && item.importance !== filters.importance) return false;
    if (filters.assertionMode && item.assertionMode !== filters.assertionMode) return false;
    if (filters.geography && normalizeSignalText(item.geography ?? "") !== normalizeSignalText(filters.geography)) {
      return false;
    }
    const date = item.eventDate ?? item.createdAt.slice(0, 10);
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    if (query) {
      const haystack = normalizeSignalText(`${item.title} ${item.summary} ${item.companyName} ${item.signalType}`);
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  matched.sort((a, b) => {
    const aDate = a.eventDate ?? a.createdAt;
    const bDate = b.eventDate ?? b.createdAt;
    if (aDate !== bDate) return aDate < bDate ? 1 : -1;
    const importance = (IMPORTANCE_RANK[b.importance] ?? 0) - (IMPORTANCE_RANK[a.importance] ?? 0);
    if (importance !== 0) return importance;
    const evidence = b.evidenceCount - a.evidenceCount;
    if (evidence !== 0) return evidence;
    return (CONFIDENCE_RANK[b.confidenceTier] ?? 0) - (CONFIDENCE_RANK[a.confidenceTier] ?? 0);
  });

  return matched.slice(0, limit);
}
