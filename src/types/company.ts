import type { AnalysisStatus, ISODate, Relevance } from "./common";

export interface Company {
  id: string;
  /** URL-safe identifier used in routes, e.g. `natura`. */
  slug: string;
  /** Short display name. */
  name: string;
  legalName: string;
  industry: string;
  country: string;
  headquarters: string;
  website: string;
  parentGroup?: string;
  brazilRelevance: Relevance;
  description: string;
}

/** A row in the "Recent Analyses" table. */
export interface RecentAnalysis {
  companyId: string;
  status: AnalysisStatus;
  opportunitiesCount: number | null;
  lastUpdatedLabel: string;
  lastUpdatedAt: ISODate;
  /** Present when the row is backed by PostgreSQL. */
  persistedAnalysisId?: string;
  persistedRunId?: string;
  /** Temporary merge marker — demo rows are not persisted. */
  source?: "persisted" | "demo";
}
