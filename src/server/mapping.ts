import "server-only";
import { getCompanyBySlug } from "@/data";
import { formatDate } from "@/lib/labels";
import type { AnalysisStatus, Company, CurrentUser, Geography, RecentAnalysis, ResearchFocus } from "@/types";
import type { AnalysisRecord, CompanyRow, ProfileRow, ResearchRunRecord, WorkspaceRow } from "@/types/database";
import { RESEARCH_STAGE_SEQUENCE } from "./constants";

export const dbToResearchFocus: Record<string, ResearchFocus> = {
  general: "General EFESO opportunity scan",
  manufacturing: "Manufacturing",
  operational_excellence: "Operational Excellence",
  supply_chain: "Supply Chain",
  cost_profitability: "Cost & Profitability",
  procurement: "Procurement",
  organization_transformation: "Organization & Transformation",
  digital_ai: "Digital & AI",
  other: "Other",
};

export const researchFocusToDb: Record<ResearchFocus, AnalysisRecord["research_focus"]> = {
  "General EFESO opportunity scan": "general",
  Manufacturing: "manufacturing",
  "Operational Excellence": "operational_excellence",
  "Supply Chain": "supply_chain",
  "Cost & Profitability": "cost_profitability",
  Procurement: "procurement",
  "Organization & Transformation": "organization_transformation",
  "Digital & AI": "digital_ai",
  Other: "other",
};

export function geographyToCountryCode(geography: Geography): string {
  if (geography === "Europe") return "BE";
  return "BR";
}

export function geographyFromCountryCode(code: string | null | undefined): Geography {
  if (code === "BE") return "Europe";
  if (code === "BR") return "Brazil";
  return "Brazil";
}

export function analysisStatusFromDb(status: string): AnalysisStatus {
  if (status === "needs_review") return "needs-review";
  if (status === "researching") return "researching";
  if (status === "ready") return "ready";
  return "draft";
}

/** UI company keeps mock ids (co-natura) so unmigrated intelligence still resolves. */
export function toUiCompany(row: CompanyRow): Company {
  const mock = getCompanyBySlug(row.slug);
  if (mock) return mock;

  return {
    id: row.id,
    slug: row.slug,
    name: row.display_name,
    legalName: row.display_name,
    industry: row.industry ?? "",
    country: row.primary_country_code === "BR" ? "Brasil" : (row.primary_country_code ?? ""),
    headquarters: "",
    website: row.primary_domain ?? "",
    brazilRelevance: row.primary_country_code === "BR" ? "high" : "medium",
    description: row.description ?? "",
  };
}

export function toCurrentUser(profile: ProfileRow, workspace: WorkspaceRow | null): CurrentUser {
  const names = profile.full_name.trim().split(/\s+/);
  const initials = `${names[0]?.[0] ?? ""}${names[names.length - 1]?.[0] ?? ""}`.toUpperCase();
  return {
    name: profile.full_name,
    role: profile.job_title ?? "",
    organization: workspace?.name === "EFESO Brazil" ? "EFESO Brasil" : (workspace?.name ?? ""),
    initials,
  };
}

export function toRecentAnalysis(
  analysis: AnalysisRecord,
  company: Company,
  run: ResearchRunRecord | null,
): RecentAnalysis {
  return {
    companyId: company.id,
    status: analysisStatusFromDb(analysis.status),
    opportunitiesCount:
      analysis.status === "ready" && company.slug === "natura"
        ? 4
        : analysis.status === "ready"
          ? null
          : null,
    lastUpdatedLabel: formatDate(analysis.updated_at),
    lastUpdatedAt: analysis.updated_at,
    persistedAnalysisId: analysis.id,
    persistedRunId: run?.id,
    source: "persisted",
  };
}

export function completedCountFromRun(run: ResearchRunRecord, phaseCount: number): number {
  if (run.status === "completed" || run.progress_percent >= 100 || run.current_stage === "completed") {
    return phaseCount;
  }
  if (run.current_stage === "report_generation") {
    return phaseCount;
  }
  const index = RESEARCH_STAGE_SEQUENCE.findIndex((item) => item.stage === run.current_stage);
  if (index >= 0) return index;
  return Math.min(phaseCount, Math.floor((run.progress_percent / 100) * phaseCount));
}

export function stageForPhaseIndex(phaseIndex: number): (typeof RESEARCH_STAGE_SEQUENCE)[number] {
  const clamped = Math.max(0, Math.min(phaseIndex, RESEARCH_STAGE_SEQUENCE.length - 1));
  return RESEARCH_STAGE_SEQUENCE[clamped];
}
