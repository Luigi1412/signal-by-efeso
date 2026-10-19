import type { AccountSignalInput, AccountSignalLinkDraft } from "./types";
import { recencyScore } from "./temporal";

function importanceScore(importance: string): number {
  if (importance === "high") return 3;
  if (importance === "medium") return 2;
  return 1;
}

function evidenceScore(confidenceTier: string, evidenceCount: number): number {
  if (confidenceTier === "direct" || evidenceCount >= 2) return 2;
  if (confidenceTier === "supported" || evidenceCount === 1) return 1;
  return 0;
}

function relationshipScore(type: AccountSignalLinkDraft["relationshipType"]): number {
  if (type === "primary") return 3;
  if (type === "supporting") return 2;
  return 1;
}

export function deriveRelationshipType(signal: AccountSignalInput, rank: number): AccountSignalLinkDraft["relationshipType"] {
  if (rank === 0 && (signal.importance === "high" || signal.importance === "medium")) return "primary";
  if (rank < 3) return "supporting";
  return "contextual";
}

export function deriveSignalWeight(signal: AccountSignalInput, relationshipType: AccountSignalLinkDraft["relationshipType"]): number {
  return (
    importanceScore(signal.importance) +
    recencyScore(signal.eventDate, signal.createdAt) +
    evidenceScore(signal.confidenceTier, signal.evidenceSnippets.length + signal.claims.length) +
    relationshipScore(relationshipType)
  );
}

export function rankSignalsForNarrative(signals: AccountSignalInput[]): AccountSignalLinkDraft[] {
  const scored = signals.map((signal) => {
    const provisional = deriveSignalWeight(signal, "supporting");
    return { signal, provisional };
  });
  scored.sort((a, b) => b.provisional - a.provisional);
  return scored.map((row, index) => {
    const relationshipType = deriveRelationshipType(row.signal, index);
    return {
      signalId: row.signal.id,
      relationshipType,
      weight: deriveSignalWeight(row.signal, relationshipType),
    };
  });
}
