import type {
  ClaimEvidenceRow,
  ClaimRow,
  EvidenceFragmentRow,
  ResearchRunSourceRow,
  SourceRow,
  SourceSnapshotRow,
} from "./database";
import type { SourceContentBlockRow } from "./extraction";

/**
 * Domain traceability object.
 * Claim → ClaimEvidence → EvidenceFragment → SourceContentBlock → SourceSnapshot → Source
 * plus ResearchRunSource participation.
 */
export interface ClaimEvidenceLink {
  relationship: ClaimEvidenceRow;
  fragment: EvidenceFragmentRow;
  snapshot: SourceSnapshotRow;
  source: SourceRow;
  researchRunSources: ResearchRunSourceRow[];
  contentBlock: SourceContentBlockRow | null;
}

export interface ClaimTraceability {
  claim: ClaimRow;
  evidence: ClaimEvidenceLink[];
}

export interface SnapshotVersioningProof {
  sourceId: string;
  snapshotAId: string;
  snapshotBId: string;
  hashA: string;
  hashB: string;
  reusedBId: string;
  snapshotCount: number;
}
