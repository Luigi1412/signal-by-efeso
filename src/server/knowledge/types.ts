import type { KnowledgeObjectType, KnowledgeTagCategory } from "./taxonomy";
import type { ValidationRecord } from "@/server/extraction/validation-types";

export interface KnowledgeCitation {
  blockId: string;
  exactQuote: string;
}

export interface KnowledgeTagSuggestion {
  category: string;
  name: string;
}

export interface KnowledgeRelationSuggestion {
  relationType: string;
  targetName: string;
  targetType: string | null;
}

export interface KnowledgeCandidateDraft {
  objectType: KnowledgeObjectType | string;
  canonicalName: string;
  description: string;
  aliases: string[];
  attributedToEfeso: boolean;
  testimonialAuthor: string | null;
  testimonialOrganization: string | null;
  tags: KnowledgeTagSuggestion[];
  relations: KnowledgeRelationSuggestion[];
  citations: KnowledgeCitation[];
}

export interface KnowledgeCitedBlock {
  id: string;
  textContent: string;
  sourceSnapshotId: string;
}

export type { ValidationRecord, KnowledgeObjectType, KnowledgeTagCategory };
