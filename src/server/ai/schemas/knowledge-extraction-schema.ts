import { z } from "zod";
import { KNOWLEDGE_EXTRACTION_SCHEMA_VERSION } from "@/server/ai/versions";
import { KNOWLEDGE_OBJECT_RELATION_TYPES, KNOWLEDGE_OBJECT_TYPES, KNOWLEDGE_TAG_CATEGORIES } from "@/server/knowledge/taxonomy";

export const knowledgeObjectTypeSchema = z.enum(KNOWLEDGE_OBJECT_TYPES);

export const knowledgeExtractionCitationSchema = z.object({
  block_id: z.string(),
  exact_quote: z.string(),
});

export const knowledgeExtractedTagSchema = z.object({
  category: z.enum(KNOWLEDGE_TAG_CATEGORIES),
  name: z.string(),
});

export const knowledgeExtractedRelationSchema = z.object({
  relation_type: z.enum(KNOWLEDGE_OBJECT_RELATION_TYPES),
  target_name: z.string(),
  target_type: knowledgeObjectTypeSchema.nullable(),
});

export const extractedKnowledgeObjectSchema = z.object({
  candidate_key: z.string(),
  object_type: knowledgeObjectTypeSchema,
  canonical_name: z.string(),
  description: z.string(),
  aliases: z.array(z.string()),
  attributed_to_efeso: z.boolean(),
  testimonial_author: z.string().nullable(),
  testimonial_organization: z.string().nullable(),
  tags: z.array(knowledgeExtractedTagSchema),
  relations: z.array(knowledgeExtractedRelationSchema),
  citations: z.array(knowledgeExtractionCitationSchema),
});

export const knowledgeExtractionOutputSchema = z.object({
  schema_version: z.literal(KNOWLEDGE_EXTRACTION_SCHEMA_VERSION),
  objects: z.array(extractedKnowledgeObjectSchema),
});

export type KnowledgeExtractionOutput = z.infer<typeof knowledgeExtractionOutputSchema>;
export type ExtractedKnowledgeObject = z.infer<typeof extractedKnowledgeObjectSchema>;
