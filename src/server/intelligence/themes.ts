import type { AccountSignalInput, AccountThemeDraft } from "./types";
import { SIGNAL_TYPE_TAG_HINTS } from "./taxonomy";

function importanceRank(value: string): number {
  if (value === "high") return 3;
  if (value === "medium") return 2;
  return 1;
}

function weightedImportance(total: number): "low" | "medium" | "high" {
  if (total >= 6 || total / 3 >= 2.5) return "high";
  if (total >= 3) return "medium";
  return "low";
}

export function deriveAccountThemes(signals: AccountSignalInput[]): AccountThemeDraft[] {
  const buckets = new Map<
    string,
    {
      tagId: string | null;
      category: string;
      canonicalName: string;
      signalIds: Set<string>;
      importanceTotal: number;
      lastSeenAt: string | null;
    }
  >();

  for (const signal of signals) {
    const tags = [
      ...signal.tags,
      ...((SIGNAL_TYPE_TAG_HINTS[signal.signalType] ?? []).map((hint) => ({
        tagId: "",
        category: hint.category,
        canonicalName: hint.canonicalName,
      })) as { tagId: string; category: string; canonicalName: string }[]),
    ];
    for (const tag of tags) {
      if (tag.category === "GEOGRAPHY") continue;
      const key = `${tag.category}:${tag.canonicalName}`;
      const current = buckets.get(key) ?? {
        tagId: tag.tagId || null,
        category: tag.category,
        canonicalName: tag.canonicalName,
        signalIds: new Set<string>(),
        importanceTotal: 0,
        lastSeenAt: null,
      };
      if (tag.tagId) current.tagId = tag.tagId;
      if (!current.signalIds.has(signal.id)) {
        current.signalIds.add(signal.id);
        current.importanceTotal += importanceRank(signal.importance);
      }
      const seen = signal.eventDate ?? signal.createdAt;
      if (!current.lastSeenAt || seen > current.lastSeenAt) current.lastSeenAt = seen;
      buckets.set(key, current);
    }
  }

  return [...buckets.values()]
    .map((bucket) => ({
      tagId: bucket.tagId,
      category: bucket.category,
      canonicalName: bucket.canonicalName,
      signalCount: bucket.signalIds.size,
      weightedImportance: weightedImportance(bucket.importanceTotal),
      lastSeenAt: bucket.lastSeenAt,
      supportingSignalIds: [...bucket.signalIds],
    }))
    .sort((a, b) => b.signalCount - a.signalCount || a.canonicalName.localeCompare(b.canonicalName));
}
