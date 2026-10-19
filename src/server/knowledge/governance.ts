export const VISIBILITY_LEVELS = ["public", "efeso_member", "restricted_account_team", "admin_only"] as const;
export type VisibilityLevel = (typeof VISIBILITY_LEVELS)[number];

export const CONFIDENTIALITY_LEVELS = ["public", "internal", "confidential", "highly_confidential"] as const;
export type ConfidentialityLevel = (typeof CONFIDENTIALITY_LEVELS)[number];

export const CLIENT_ATTRIBUTIONS = ["none", "named", "anonymized"] as const;
export type ClientAttribution = (typeof CLIENT_ATTRIBUTIONS)[number];

export const KNOWLEDGE_NATURES = [
  "institutional_fact",
  "reusable_methodology",
  "client_reported_need",
  "diagnostic_finding",
  "proposed_scope",
  "expected_benefit",
  "historical_benchmark",
  "delivered_result",
  "client_testimonial",
  "commercial_claim",
] as const;
export type KnowledgeNature = (typeof KNOWLEDGE_NATURES)[number];

export const OUTCOME_STATUSES = [
  "not_applicable",
  "proposed",
  "expected",
  "potential",
  "estimated",
  "benchmark",
  "delivered",
  "client_reported",
  "independently_verified",
] as const;
export type OutcomeStatus = (typeof OUTCOME_STATUSES)[number];

export const KNOWLEDGE_ORIGINS = ["public_official", "curated_internal", "restricted_internal", "demo_seed"] as const;
export type KnowledgeOrigin = (typeof KNOWLEDGE_ORIGINS)[number];

export const MEMBER_VISIBLE_VISIBILITY: VisibilityLevel[] = ["public", "efeso_member"];
export const MEMBER_VISIBLE_CONFIDENTIALITY: ConfidentialityLevel[] = ["public", "internal"];

const FORBIDDEN_NATURE_OUTCOMES: Record<KnowledgeNature, OutcomeStatus[]> = {
  institutional_fact: [],
  reusable_methodology: ["delivered"],
  client_reported_need: ["delivered", "independently_verified"],
  diagnostic_finding: ["delivered"],
  proposed_scope: ["delivered", "client_reported", "independently_verified"],
  expected_benefit: ["delivered", "independently_verified"],
  historical_benchmark: ["delivered"],
  delivered_result: ["proposed", "expected", "potential", "estimated"],
  client_testimonial: ["proposed"],
  commercial_claim: ["delivered", "independently_verified"],
};

export function validateNatureOutcome(
  nature: KnowledgeNature,
  outcome: OutcomeStatus,
): { ok: true } | { ok: false; reason: string } {
  if (nature === "proposed_scope" && outcome === "delivered") {
    return { ok: false, reason: "proposed_scope_is_never_delivered_result" };
  }
  if (nature === "expected_benefit" && outcome === "delivered") {
    return { ok: false, reason: "expected_benefit_is_never_delivered" };
  }
  const forbidden = FORBIDDEN_NATURE_OUTCOMES[nature] ?? [];
  if (forbidden.includes(outcome)) {
    return { ok: false, reason: `${nature}_cannot_be_${outcome}` };
  }
  return { ok: true };
}

export function isMemberVisibleKnowledge(input: {
  visibilityLevel: VisibilityLevel | string;
  confidentialityLevel: ConfidentialityLevel | string;
  approvedForDisplay: boolean;
  commercialTermsPresent: boolean;
  knowledgeNature: KnowledgeNature | string;
}): boolean {
  if (!input.approvedForDisplay) return false;
  if (input.commercialTermsPresent) return false;
  if (!MEMBER_VISIBLE_VISIBILITY.includes(input.visibilityLevel as VisibilityLevel)) return false;
  if (!MEMBER_VISIBLE_CONFIDENTIALITY.includes(input.confidentialityLevel as ConfidentialityLevel)) return false;
  if (input.knowledgeNature === "client_reported_need") return false;
  if (input.knowledgeNature === "commercial_claim") return false;
  return true;
}

export function canUseForMatching(input: {
  approvedForMatching: boolean;
  status: string;
}): boolean {
  return input.approvedForMatching && input.status === "active";
}

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}\b/g;
const PRICE_RE =
  /(?:R\$|US\$|USD|EUR|€)\s?[\d.]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\b(?:investimento|tarifa|honorários?|fee|pricing|preço|condições comerciais)\b/gi;
const SOURCE_ID_RE = /\b(?:src|source)[-_][a-z0-9-]+\b/gi;

export function containsForbiddenMemberLeak(text: string): boolean {
  EMAIL_RE.lastIndex = 0;
  PRICE_RE.lastIndex = 0;
  PHONE_RE.lastIndex = 0;
  return EMAIL_RE.test(text) || PRICE_RE.test(text) || PHONE_RE.test(text);
}

export function sanitizeMemberText(text: string): string {
  return text.replace(EMAIL_RE, "[redacted]").replace(PHONE_RE, "[redacted]").replace(PRICE_RE, "[redacted]").replace(SOURCE_ID_RE, "[source]");
}

export function sanitizeMemberExplanation(input: {
  explanation: string;
  visibilityLevel: VisibilityLevel | string;
  confidentialityLevel: ConfidentialityLevel | string;
  restricted?: boolean;
}): string {
  const restricted =
    input.restricted ||
    input.visibilityLevel === "restricted_account_team" ||
    input.visibilityLevel === "admin_only" ||
    input.confidentialityLevel === "confidential" ||
    input.confidentialityLevel === "highly_confidential";
  if (restricted) {
    return "Capacidade, metodologia ou problema EFESO relacionado ao contexto desta conta.";
  }
  return sanitizeMemberText(input.explanation);
}

export function isDemoOrigin(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { origin?: unknown }).origin === "demo_seed";
}

export function knowledgeOrigin(metadata: unknown): KnowledgeOrigin | null {
  if (!metadata || typeof metadata !== "object") return null;
  const origin = (metadata as { origin?: unknown }).origin;
  if (typeof origin !== "string") return null;
  return (KNOWLEDGE_ORIGINS as readonly string[]).includes(origin) ? (origin as KnowledgeOrigin) : null;
}
