import type {
  AnalysisStatus,
  EvidenceType,
  Geography,
  ISODate,
  ResearchFocus,
} from "./common";

export interface WhyNowItem {
  id: string;
  title: string;
  detail: string;
  type: EvidenceType;
  periodLabel: string;
}

export interface FootprintItem {
  id: string;
  value: string;
  label: string;
  type: EvidenceType;
}

export interface AnalysisHealth {
  evidenceQuality: "Strong" | "Moderate" | "Weak";
  primarySourceCoverage: number;
  conflicts: number;
  insufficientDataAreas: number;
  insufficientDataTopics: string[];
}

export interface ExecutiveSignalContent {
  known: string;
  meaning: string;
  toValidate: string;
}

export interface Analysis {
  id: string;
  companyId: string;
  version: string;
  status: AnalysisStatus;
  focus: ResearchFocus;
  geography: Geography;
  updatedAt: ISODate;
  updatedAtLabel: string;
  executiveSignal: ExecutiveSignalContent;
  whyNow: WhyNowItem[];
  brazilFootprint: FootprintItem[];
  health: AnalysisHealth;
}

export interface AnalysisVersionChange {
  id: string;
  text: string;
}

export interface AnalysisVersion {
  id: string;
  companyId: string;
  version: string;
  isCurrent: boolean;
  dateLabel: string;
  date: ISODate;
  author: string;
  summary: string;
  changes: AnalysisVersionChange[];
}

export type ResearchPhaseStatus = "pending" | "active" | "done";

export interface ResearchPhase {
  id: string;
  label: string;
  detail: string;
  /** Simulated duration in milliseconds. */
  durationMs: number;
}

export interface ResearchLiveSummary {
  sourcesDiscovered: number;
  sourcesRetained: number;
  verifiedClaims: number;
  emergingOpportunities: number;
  potentialConflicts: number;
}
