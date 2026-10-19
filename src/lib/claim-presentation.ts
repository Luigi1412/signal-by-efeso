import type { EvidenceType, Geography } from "@/types";
import type { EvidenceClaim, PersistedEvidenceTrace } from "@/types/evidence";
import type { ClaimTraceability } from "@/types/evidence-foundation";
import { deriveEvidenceSummary } from "@/lib/evidence-summary";

/**
 * Presentation only. Database stores claim_type, verification_status,
 * review_status and claim_status as four distinct fields.
 */
export function presentationTypeFromClaim(input: {
  claim_type: string;
  verification_status: string;
}): EvidenceType {
  if (input.verification_status === "conflicted") return "conflict";
  if (input.claim_type === "hypothesis") return "hypothesis";
  if (input.claim_type === "derived") return "derived";
  if (
    (input.claim_type === "fact" || input.claim_type === "client_confirmed") &&
    (input.verification_status === "supported" || input.verification_status === "corroborated")
  ) {
    return "verified";
  }
  return "unverified";
}

export function geographyFromPersistedClaim(input: {
  geography_level: string | null;
  country_code: string | null;
}): Geography {
  if (input.geography_level === "global") return "Global";
  if (input.country_code === "BR") return "Brazil";
  if (input.geography_level === "region") return "Latin America";
  return "Brazil";
}

export function periodLabelFromClaim(input: {
  period_type: string | null;
  period_start: string | null;
  period_end: string | null;
  as_of_date: string | null;
}): string {
  if (input.as_of_date) return input.as_of_date;
  if (input.period_start && input.period_end) return `${input.period_start} – ${input.period_end}`;
  if (input.period_start) return input.period_start;
  if (input.period_type === "not_applicable") return "Não aplicável";
  return "—";
}

export function toPersistedEvidenceClaims(traces: ClaimTraceability[]): EvidenceClaim[] {
  return traces.map(traceToEvidenceClaim);
}

export function traceToEvidenceClaim(trace: ClaimTraceability): EvidenceClaim {
  const primary = trace.evidence[0];
  const uniqueSourceIds = [...new Set(trace.evidence.map((item) => item.source.id))];
  const persisted: PersistedEvidenceTrace | undefined = primary
    ? {
        claimType: trace.claim.claim_type,
        verificationStatus: trace.claim.verification_status,
        reviewStatus: trace.claim.review_status,
        claimStatus: trace.claim.claim_status,
        geographyDisplay: geographyLabelLoose(trace.claim.geography_level, trace.claim.country_code),
        periodDisplay: periodLabelFromClaim(trace.claim),
        sourcePublisher: primary.source.publisher_name,
        sourceType: primary.source.source_type,
        sourceTier: primary.source.source_tier,
        isPrimarySource: primary.source.is_primary_source,
        snapshotTitle: primary.snapshot.title,
        publicationDate: primary.snapshot.publication_date,
        capturedAt: primary.snapshot.captured_at,
        pageNumber: primary.fragment.page_number,
        sectionTitle: primary.fragment.section_title,
        excerpt: primary.fragment.excerpt,
        contextBefore: primary.fragment.context_before,
        contextAfter: primary.fragment.context_after,
        relationship: primary.relationship.relationship,
        directness: primary.relationship.directness,
        storageKey: primary.snapshot.storage_key,
        snapshotId: primary.snapshot.id,
        researchRunId: primary.researchRunSources[0]?.research_run_id ?? trace.claim.originating_research_run_id,
        assertionMode: trace.claim.assertion_mode ?? null,
        contentBlockId: primary.contentBlock?.id ?? primary.fragment.source_content_block_id,
        originClaimCandidateId: trace.claim.origin_claim_candidate_id,
        originModelRunId: null,
        canonicalUrl: primary.source.canonical_url ?? null,
      }
    : undefined;

  return {
    id: trace.claim.id,
    companyId: trace.claim.company_id,
    claim: trace.claim.statement,
    type: presentationTypeFromClaim(trace.claim),
    confidence: trace.claim.confidence_score == null ? null : Number(trace.claim.confidence_score),
    sourceIds: uniqueSourceIds,
    geography: geographyFromPersistedClaim(trace.claim),
    period: periodLabelFromClaim(trace.claim),
    excerpt: primary?.fragment.excerpt ?? "",
    whyItMatters:
      "Este achado é sintético e existe apenas para validar a rastreabilidade no desenvolvimento do Signal.",
    origin: "persisted",
    persisted,
  };
}

function geographyLabelLoose(level: string | null, countryCode: string | null): string | null {
  if (!level && !countryCode) return null;
  const parts = [level, countryCode].filter(Boolean);
  return parts.join(" · ");
}

export { deriveEvidenceSummary };
