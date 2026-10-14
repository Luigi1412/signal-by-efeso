/** Shared primitives used across the Signal data model. */

export type ISODate = string;

/** The four epistemic states Signal distinguishes. */
export type EvidenceType = "verified" | "derived" | "hypothesis" | "conflict";

export type Relevance = "high" | "medium" | "low";

export type Geography =
  | "Brazil"
  | "Global"
  | "Brazil proxy"
  | "Latin America"
  | "Europe";

export type AnalysisStatus = "ready" | "researching" | "needs-review" | "draft";

export type ResearchFocus =
  | "General EFESO opportunity scan"
  | "Manufacturing"
  | "Operational Excellence"
  | "Supply Chain"
  | "Cost & Profitability"
  | "Procurement"
  | "Organization & Transformation"
  | "Digital & AI"
  | "Other";

export type SignalCategory =
  | "Manufacturing"
  | "Strategy"
  | "Financial Performance"
  | "Supply Chain"
  | "Organization"
  | "Digital"
  | "Market";

export type SourceType =
  | "Annual report"
  | "Investor presentation"
  | "Regulatory filing"
  | "Press release"
  | "Company website"
  | "News"
  | "Industry report"
  | "Earnings call transcript";
