export const EXTERNAL_RESEARCH_STATUSES = [
  "queued",
  "resolving_entity",
  "needs_user_resolution",
  "discovering_sources",
  "reviewing_sources",
  "ingesting_sources",
  "extracting_claims",
  "generating_signals",
  "generating_intelligence",
  "generating_opportunities",
  "generating_actions",
  "completed",
  "partial",
  "failed",
  "cancelled",
] as const;

export type ExternalResearchStatus = (typeof EXTERNAL_RESEARCH_STATUSES)[number];

export const SOURCE_CANDIDATE_TYPES = [
  "official_page",
  "press_release",
  "annual_report",
  "sustainability_report",
  "earnings_release",
  "filing",
  "regulator",
  "news",
  "other",
] as const;

export type ExternalSourceType = (typeof SOURCE_CANDIDATE_TYPES)[number];

export const SOURCE_QUALITIES = ["primary", "authoritative_secondary", "secondary", "weak"] as const;
export type SourceQuality = (typeof SOURCE_QUALITIES)[number];

export const SOURCE_CANDIDATE_STATUSES = [
  "discovered",
  "accepted",
  "rejected",
  "fetched",
  "failed",
  "unavailable",
] as const;

export type SourceCandidateStatus = (typeof SOURCE_CANDIDATE_STATUSES)[number];

export type ResearchFailureCode =
  | "ENTITY_AMBIGUOUS"
  | "NO_RELIABLE_SOURCES"
  | "SOURCE_FETCH_FAILED"
  | "PARSER_UNSUPPORTED"
  | "OPENAI_NOT_CONFIGURED"
  | "OPENAI_FAILED"
  | "LOCAL_MODEL_UNAVAILABLE"
  | "PIPELINE_VALIDATION_FAILED"
  | "QUOTA_EXCEEDED"
  | "CANCELLED"
  | "PROVIDER_NOT_CONFIGURED"
  | "TAVILY_AUTH_FAILED"
  | "TAVILY_RATE_LIMITED"
  | "TAVILY_TIMEOUT"
  | "TAVILY_PROVIDER_ERROR";

export interface CompanyIdentity {
  canonicalName: string;
  officialDomain: string;
  headquartersCountry: string;
  industry: string;
  aliases: string[];
  decisionBasis: string[];
}

export interface EntityCandidate extends CompanyIdentity {
  existingCompanyId: string | null;
  existingSlug: string | null;
}

export type EntityResolution =
  | { kind: "resolved"; candidate: EntityCandidate }
  | { kind: "ambiguous"; candidates: EntityCandidate[] }
  | { kind: "unresolved"; suggestions: EntityCandidate[] };

export interface DiscoveredSource {
  url: string;
  title: string | null;
  publisher: string;
  sourceType: ExternalSourceType;
  sourceTier: 1 | 2 | 3 | 4;
  publishedAt: string | null;
  canonicalUrl?: string | null;
}

export interface AssessedSource extends DiscoveredSource {
  normalizedUrl: string;
  sourceQuality: SourceQuality;
  accepted: boolean;
  rejectionReason: string | null;
  contentHash?: string | null;
}

export interface SearchQuery {
  query: string;
  site: string | null;
}

export interface FetchedDocument {
  url: string;
  finalUrl: string;
  bytes: Uint8Array;
  mimeType: string;
  title: string | null;
}

export interface ExternalResearchProvider {
  readonly name: string;
  search(input: { query: string; limit: number }): Promise<DiscoveredSource[]>;
  fetchPage(url: string): Promise<FetchedDocument>;
  fetchDocument(url: string): Promise<FetchedDocument>;
}

export interface ExternalResearchRunRow {
  id: string;
  workspace_id: string;
  requested_query: string;
  normalized_query: string;
  requested_country: string | null;
  requested_industry: string | null;
  time_horizon_months: number;
  resolved_company_id: string | null;
  analysis_id: string | null;
  research_run_id: string | null;
  status: ExternalResearchStatus;
  started_at: string;
  completed_at: string | null;
  failure_reason: string | null;
  failure_code: string | null;
  source_count: number;
  accepted_source_count: number;
  rejected_source_count: number;
  unavailable_source_count: number;
  resolution_payload: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalSourceCandidateRow {
  id: string;
  workspace_id: string;
  research_run_id: string;
  url: string;
  normalized_url: string;
  title: string | null;
  publisher: string;
  source_type: ExternalSourceType;
  source_tier: number;
  source_quality: SourceQuality;
  published_at: string | null;
  discovered_at: string;
  status: SourceCandidateStatus;
  rejection_reason: string | null;
  canonical_url: string | null;
  content_hash: string | null;
  source_id: string | null;
  snapshot_id: string | null;
  created_at: string;
}

export const RESEARCH_PHASES = [
  { status: "resolving_entity", labelKey: "identifying" },
  { status: "discovering_sources", labelKey: "findingSources" },
  { status: "reviewing_sources", labelKey: "validatingSources" },
  { status: "ingesting_sources", labelKey: "processingDocuments" },
  { status: "extracting_claims", labelKey: "extractingFacts" },
  { status: "generating_signals", labelKey: "generatingSignals" },
  { status: "generating_intelligence", labelKey: "buildingIntelligence" },
  { status: "generating_opportunities", labelKey: "identifyingOpportunities" },
  { status: "generating_actions", labelKey: "preparingNextSteps" },
] as const;
