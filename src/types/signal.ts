import type { Geography, ISODate, Relevance, SignalCategory } from "./common";

/** What is happening in the company — deliberately separate from EFESO recommendations. */
export interface CompanySignal {
  id: string;
  companyId: string;
  date: ISODate;
  /** Human-readable period label, e.g. "March 2026". */
  periodLabel: string;
  title: string;
  summary: string;
  type: "verified" | "derived";
  category: SignalCategory;
  geography: Geography;
  brazilRelevance?: Relevance;
  sourceIds: string[];
  /** The evidence claim that backs this signal. */
  evidenceClaimId: string;
  relatedOpportunityIds: string[];
}
