import type { EvidenceType } from "./common";

/** Report content is structured intelligence rendered as blocks — not prose walls. */

export interface ReportParagraphBlock {
  kind: "paragraph";
  text: string;
}

export interface ReportKeyFindingsBlock {
  kind: "key-findings";
  title?: string;
  items: { text: string; type: EvidenceType; claimId?: string }[];
}

export interface ReportMetricsBlock {
  kind: "metrics";
  items: { label: string; value: string; type?: EvidenceType; note?: string }[];
}

export interface ReportTableBlock {
  kind: "table";
  title?: string;
  columns: string[];
  rows: string[][];
  /** Optional per-row evidence type rendered as a status badge in the last column. */
  rowTypes?: EvidenceType[];
  note?: string;
}

export interface ReportCalloutBlock {
  kind: "callout";
  tone: "neutral" | "hypothesis" | "conflict" | "verified";
  title: string;
  text: string;
}

export interface ReportOpportunityBlock {
  kind: "opportunity";
  opportunityId: string;
}

export interface ReportListBlock {
  kind: "list";
  title?: string;
  items: string[];
  ordered?: boolean;
}

export interface ReportSourcesBlock {
  kind: "sources";
  sourceIds: string[];
}

export type ReportBlock =
  | ReportParagraphBlock
  | ReportKeyFindingsBlock
  | ReportMetricsBlock
  | ReportTableBlock
  | ReportCalloutBlock
  | ReportOpportunityBlock
  | ReportListBlock
  | ReportSourcesBlock;

export interface ReportSection {
  id: string;
  /** Zero-padded index, e.g. "01". */
  number: string;
  title: string;
  blocks: ReportBlock[];
}
