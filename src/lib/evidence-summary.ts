import type { EvidenceClaim, EvidenceSummary } from "@/types";

/** Derive summary metrics from the retained claims dataset — never hardcode parallel totals. */
export function deriveEvidenceSummary(claims: EvidenceClaim[]): EvidenceSummary {
  const sourceIds = new Set<string>();
  for (const claim of claims) {
    for (const id of claim.sourceIds) sourceIds.add(id);
  }

  return {
    verifiedClaims: claims.filter((c) => c.type === "verified").length,
    derivedMetrics: claims.filter((c) => c.type === "derived").length,
    hypotheses: claims.filter((c) => c.type === "hypothesis").length,
    conflicts: claims.filter((c) => c.type === "conflict").length,
    sourcesRetained: sourceIds.size,
  };
}
