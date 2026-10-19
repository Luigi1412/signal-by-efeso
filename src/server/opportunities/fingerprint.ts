import { sha256Json } from "@/server/extraction/sha256";
import type { OpportunityDraft } from "./types";

const STOP = new Set([
  "potential",
  "potencial",
  "possible",
  "possivel",
  "possível",
  "opportunity",
  "oportunidade",
  "support",
  "suporte",
  "linked",
  "associada",
  "associated",
  "may",
  "might",
  "pode",
  "the",
  "a",
  "an",
  "de",
  "da",
  "do",
  "em",
  "for",
  "to",
  "from",
  "new",
  "facility",
  "plant",
]);

export function normalizeCoreHypothesis(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP.has(token))
    .sort()
    .join(" ");
}

export function computeOpportunityFingerprint(input: {
  companyId: string;
  opportunityType: string;
  title: string;
  summary: string;
  triggerSignalIds: string[];
  primaryCapability: string | null;
}): string {
  return sha256Json({
    company_id: input.companyId,
    opportunity_type: input.opportunityType,
    core_hypothesis: normalizeCoreHypothesis(`${input.title} ${input.summary}`),
    trigger_signal_ids: [...input.triggerSignalIds].sort(),
    primary_capability: input.primaryCapability,
  });
}

export function fingerprintFromDraft(companyId: string, draft: OpportunityDraft, primaryCapability: string | null): string {
  return computeOpportunityFingerprint({
    companyId,
    opportunityType: draft.opportunityType,
    title: draft.title,
    summary: draft.summary,
    triggerSignalIds: draft.signalLinks
      .filter((link) => link.relationshipType === "trigger")
      .map((link) => link.signalId),
    primaryCapability,
  });
}
