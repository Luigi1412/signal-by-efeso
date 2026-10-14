import { ui } from "@/i18n";

export type EvidenceFilterId = "all" | "verified" | "derived" | "hypothesis" | "conflict" | "primary";

export const evidenceFilters: { id: EvidenceFilterId; label: string }[] = [
  { id: "all", label: ui.evidence.filters.all },
  { id: "verified", label: ui.evidence.filters.verified },
  { id: "derived", label: ui.evidence.filters.derived },
  { id: "hypothesis", label: ui.evidence.filters.hypothesis },
  { id: "conflict", label: ui.evidence.filters.conflict },
  { id: "primary", label: ui.evidence.filters.primary },
];

export function parseEvidenceFilter(value: string | string[] | undefined): EvidenceFilterId {
  const candidate = Array.isArray(value) ? value[0] : value;
  return evidenceFilters.some((f) => f.id === candidate) ? (candidate as EvidenceFilterId) : "all";
}
