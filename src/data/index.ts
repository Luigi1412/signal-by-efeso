import type {
  Analysis,
  AnalysisVersion,
  Capability,
  Company,
  CompanySignal,
  Conflict,
  EvidenceClaim,
  EvidenceSource,
  Opportunity,
  ReportSection,
} from "@/types";
import { analyses, analysisVersions } from "./analyses";
import { capabilities } from "./capabilities";
import { companies } from "./companies";
import { REPORT_LOCALE, type ReportLocale } from "@/i18n";
import { deriveEvidenceSummary } from "@/lib/evidence-summary";
import { conflicts, evidenceClaims } from "./evidence";
import { opportunities } from "./opportunities";
import { reportSections } from "./report";
import { companySignals } from "./signals";
import { sources } from "./sources";

/**
 * Typed accessors over the local mock data.
 * In a future iteration these become the data-access boundary for a real backend.
 */

export function getCompanies(): Company[] {
  return companies;
}

export function getCompanyBySlug(slug: string): Company | undefined {
  return companies.find((c) => c.slug === slug);
}

export function getCompanyById(id: string): Company | undefined {
  return companies.find((c) => c.id === id);
}

export function findCompanyByName(query: string): Company | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return companies.find(
    (c) => c.name.toLowerCase().includes(q) || c.legalName.toLowerCase().includes(q),
  );
}

export function getAnalysisForCompany(companyId: string): Analysis | undefined {
  return analyses.find((a) => a.companyId === companyId);
}

export function getSignalsForCompany(companyId: string): CompanySignal[] {
  return companySignals
    .filter((s) => s.companyId === companyId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getOpportunitiesForCompany(companyId: string): Opportunity[] {
  return opportunities
    .filter((o) => o.companyId === companyId)
    .sort((a, b) => b.score - a.score);
}

export function getOpportunityById(id: string): Opportunity | undefined {
  return opportunities.find((o) => o.id === id);
}

export function getClaimsForCompany(companyId: string): EvidenceClaim[] {
  return evidenceClaims.filter((c) => c.companyId === companyId);
}

export function getClaimById(id: string): EvidenceClaim | undefined {
  return evidenceClaims.find((c) => c.id === id);
}

export function getConflictsForCompany(companyId: string): Conflict[] {
  return conflicts.filter((c) => c.companyId === companyId);
}

export function getConflictById(id: string): Conflict | undefined {
  return conflicts.find((c) => c.id === id);
}

export function getSourceById(id: string): EvidenceSource | undefined {
  return sources.find((s) => s.id === id);
}

export function getSourcesByIds(ids: string[]): EvidenceSource[] {
  return ids.map(getSourceById).filter((s): s is EvidenceSource => Boolean(s));
}

export function getCapabilitiesByIds(ids: string[]): Capability[] {
  return ids
    .map((id) => capabilities.find((c) => c.id === id))
    .filter((c): c is Capability => Boolean(c));
}

export function getVersionsForCompany(companyId: string): AnalysisVersion[] {
  return analysisVersions.filter((v) => v.companyId === companyId);
}

export function getEvidenceSummaryForCompany(companyId: string) {
  return deriveEvidenceSummary(getClaimsForCompany(companyId));
}

export function getReportForCompany(companyId: string, locale: ReportLocale = REPORT_LOCALE): ReportSection[] {
  // Report language is independent of the UI locale. Only pt-BR content exists in this iteration.
  void locale;
  return companyId === "co-natura" ? reportSections : [];
}

export { companies, recentAnalyses, homeMetrics } from "./companies";
export { currentUser } from "./user";
export { researchPhases, researchFinalSummary } from "./analyses";
export { capabilities } from "./capabilities";
export { sources } from "./sources";
