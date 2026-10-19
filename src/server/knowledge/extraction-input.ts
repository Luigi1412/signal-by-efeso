import type { ExtractedKnowledgeObject } from "@/server/ai/schemas/knowledge-extraction-schema";
import { KNOWLEDGE_OBJECT_RELATION_TYPES } from "./taxonomy";
import type { KnowledgeCandidateDraft } from "./types";
import type { SourceContentBlockRow } from "@/server/extraction/pipeline-rows";

export function serializeKnowledgeExtractionWindow(blocks: SourceContentBlockRow[]): string {
  return JSON.stringify({
    blocks: blocks.map((block) => ({
      block_id: block.id,
      block_index: block.block_index,
      block_type: block.block_type,
      page_number: block.page_number,
      section_title: block.section_title,
      text: block.text_content,
    })),
  });
}

export function serializeKnowledgeValidationInput(input: {
  draft: KnowledgeCandidateDraft;
  citedBlocks: SourceContentBlockRow[];
  existingObjectNames: string[];
}): string {
  return JSON.stringify({
    candidate: {
      object_type: input.draft.objectType,
      canonical_name: input.draft.canonicalName,
      description: input.draft.description,
      aliases: input.draft.aliases,
      attributed_to_efeso: input.draft.attributedToEfeso,
      testimonial_author: input.draft.testimonialAuthor,
      testimonial_organization: input.draft.testimonialOrganization,
      tags: input.draft.tags,
      relations: input.draft.relations,
      citations: input.draft.citations,
    },
    cited_blocks: input.citedBlocks.map((block) => ({
      block_id: block.id,
      page_number: block.page_number,
      section_title: block.section_title,
      text: block.text_content,
    })),
    existing_object_names: input.existingObjectNames,
  });
}

export function extractedKnowledgeToDraft(object: ExtractedKnowledgeObject): KnowledgeCandidateDraft {
  return {
    objectType: object.object_type,
    canonicalName: object.canonical_name.trim(),
    description: object.description.trim(),
    aliases: object.aliases.map((alias) => alias.trim()).filter(Boolean),
    attributedToEfeso: object.attributed_to_efeso,
    testimonialAuthor: emptyToNull(object.testimonial_author),
    testimonialOrganization: emptyToNull(object.testimonial_organization),
    tags: object.tags.map((tag) => ({ category: tag.category, name: tag.name })),
    relations: object.relations
      .filter((relation) =>
        KNOWLEDGE_OBJECT_RELATION_TYPES.includes(relation.relation_type as (typeof KNOWLEDGE_OBJECT_RELATION_TYPES)[number]),
      )
      .map((relation) => ({
        relationType: relation.relation_type,
        targetName: relation.target_name,
        targetType: relation.target_type,
      })),
    citations: object.citations.map((citation) => ({
      blockId: citation.block_id,
      exactQuote: citation.exact_quote,
    })),
  };
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
