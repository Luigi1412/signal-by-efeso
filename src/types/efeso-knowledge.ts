export interface KnowledgeCandidateView {
  id: string;
  objectType: string;
  canonicalName: string;
  description: string;
  status: string;
  attributedToEfeso: boolean;
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
  originModelRunId: string;
  promotedKnowledgeObjectId: string | null;
  proposedTags: unknown;
  proposedAliases: unknown;
  proposedRelations: unknown;
  citations: {
    exactQuote: string;
    pageNumber: number | null;
    sectionTitle: string | null;
    charStart: number | null;
    charEnd: number | null;
  }[];
  validations: {
    validatorCode: string;
    result: string;
    severity: string;
    message: string | null;
    supportLevel?: unknown;
  }[];
}

export interface KnowledgeExtractionSummary {
  snapshotId: string;
  sourceId: string;
  blockCount: number;
  windowCount: number;
  candidateCount: number;
  promotedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  objectCount: number;
  candidates: KnowledgeCandidateView[];
}

export interface EfesoKnowledgeListItem {
  id: string;
  canonicalName: string;
  objectType: string;
  shortDescription: string;
  status: string;
  rank: number;
  matchedBecause: string[];
  tags: { category: string; canonicalName: string }[];
  demoOrigin?: boolean;
  catalogSection?: string | null;
  origin?: string | null;
}

export interface EfesoKnowledgeDetail {
  id: string;
  canonicalName: string;
  objectType: string;
  shortDescription: string;
  status: string;
  sourceSnapshotId: string;
  primaryContentBlockId: string | null;
  originModelRunId: string | null;
  originCandidateId: string | null;
  supersedesObjectId: string | null;
  createdAt: string;
  updatedAt: string;
  aliases: string[];
  tags: { category: string; canonicalName: string }[];
  relations: {
    id: string;
    sourceObjectId: string;
    targetObjectId: string;
    relationType: string;
    status: string;
  }[];
  claims: { id: string; statement: string; relationshipType: string }[];
  evidence: {
    exactQuote: string;
    pageNumber: number | null;
    sectionTitle: string | null;
    snapshotId: string;
    blockId: string;
  }[];
  provenance: {
    snapshotId: string;
    candidateId: string | null;
    modelRunId: string | null;
    validations: { validatorCode: string; result: string; message: string | null }[];
  };
  demoOrigin?: boolean;
  catalogSection?: string | null;
  origin?: string | null;
  showProvenance?: boolean;
}

export interface RelevantEfesoKnowledgeHit {
  knowledgeObject: {
    id: string;
    canonicalName: string;
    objectType: string;
    shortDescription: string;
  };
  matchedBecause: string[];
  claims: { id: string; statement: string; relationshipType: string }[];
  evidence: { exactQuote: string; snapshotId: string }[];
}
