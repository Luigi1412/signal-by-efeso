import { z } from "zod";
import { SOURCE_DOCUMENT_TYPES } from "./efeso-knowledge-sources";
import {
  CLIENT_ATTRIBUTIONS,
  CONFIDENTIALITY_LEVELS,
  KNOWLEDGE_NATURES,
  KNOWLEDGE_ORIGINS,
  OUTCOME_STATUSES,
  VISIBILITY_LEVELS,
  containsForbiddenMemberLeak,
  validateNatureOutcome,
} from "./governance";
import { KNOWLEDGE_OBJECT_TYPES } from "./taxonomy";

export const knowledgeSourceReferenceSchema = z.object({
  source_id: z.string().min(1),
  locator: z.string().min(1).optional(),
});

export const knowledgePackObjectSchema = z.object({
  stable_key: z.string().min(1).regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  canonical_name: z.string().min(1),
  object_type: z.enum(KNOWLEDGE_OBJECT_TYPES),
  knowledge_nature: z.enum(KNOWLEDGE_NATURES),
  outcome_status: z.enum(OUTCOME_STATUSES),
  description: z.string().min(1),
  service_families: z.array(z.string()),
  capabilities: z.array(z.string()),
  methods: z.array(z.string()),
  business_problems: z.array(z.string()),
  industries: z.array(z.string()),
  dimensions: z.array(z.string()),
  engagement_stages: z.array(z.string()),
  aliases: z.array(z.string()),
  source_references: z.array(knowledgeSourceReferenceSchema).min(1),
  visibility_level: z.enum(VISIBILITY_LEVELS),
  confidentiality_level: z.enum(CONFIDENTIALITY_LEVELS),
  approved_for_matching: z.boolean(),
  approved_for_display: z.boolean(),
  origin: z.enum(KNOWLEDGE_ORIGINS),
  client_attribution: z.enum(CLIENT_ATTRIBUTIONS),
  catalog_section: z.enum([
    "what_we_do",
    "problems_we_solve",
    "how_we_work",
    "industries",
    "cases_and_results",
    "credentials",
  ]),
  relations: z
    .array(
      z.object({
        target_stable_key: z.string().min(1),
        relation_type: z.string().min(1),
      }),
    )
    .default([]),
});

export const sourceManifestEntrySchema = z.object({
  source_id: z.string().min(1),
  filename: z.string().nullable(),
  url: z.string().nullable(),
  source_document_type: z.enum(SOURCE_DOCUMENT_TYPES),
  publication_date: z.string().nullable(),
  effective_date: z.string().nullable(),
  visibility_level: z.enum(VISIBILITY_LEVELS),
  confidentiality_level: z.enum(CONFIDENTIALITY_LEVELS),
  contains_commercial_terms: z.boolean(),
  contains_personal_contacts: z.boolean(),
  contains_client_specific_information: z.boolean(),
  approved_for_global_knowledge: z.boolean(),
  approved_for_matching: z.boolean(),
  approved_for_member_display: z.boolean(),
  fetch_status: z.enum([
    "present_in_repo",
    "pending_private_file",
    "pending_official_snapshot",
    "captured",
    "canonical_catalog",
  ]),
  title: z.string().nullable().optional(),
  fetched_at: z.string().nullable().optional(),
  content_hash: z.string().nullable().optional(),
});

export const knowledgePackSchema = z.object({
  pack_id: z.literal("efeso-knowledge-pack.v1"),
  version: z.literal("v1"),
  generated_from: z.string().min(1),
  objects: z.array(knowledgePackObjectSchema).min(1),
});

export type KnowledgePack = z.infer<typeof knowledgePackSchema>;
export type KnowledgePackObject = z.infer<typeof knowledgePackObjectSchema>;
export type SourceManifestEntry = z.infer<typeof sourceManifestEntrySchema>;

export interface PackValidationIssue {
  code: string;
  message: string;
  stableKey?: string;
}

export function validateKnowledgePack(
  pack: KnowledgePack,
  sourceIds: Set<string>,
): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  const keys = new Set<string>();
  const aliases = new Map<string, string>();

  for (const object of pack.objects) {
    if (keys.has(object.stable_key)) {
      issues.push({ code: "duplicate_stable_key", message: object.stable_key, stableKey: object.stable_key });
    }
    keys.add(object.stable_key);

    const natureCheck = validateNatureOutcome(object.knowledge_nature, object.outcome_status);
    if (!natureCheck.ok) {
      issues.push({ code: "invalid_nature_outcome", message: natureCheck.reason, stableKey: object.stable_key });
    }

    if (object.object_type === "case" && object.knowledge_nature === "proposed_scope") {
      issues.push({
        code: "proposal_is_not_a_case",
        message: "commercial proposals cannot become completed cases",
        stableKey: object.stable_key,
      });
    }

    if (containsForbiddenMemberLeak(`${object.canonical_name} ${object.description} ${object.aliases.join(" ")}`)) {
      issues.push({
        code: "forbidden_member_leak",
        message: "price, contact, or commercial term found in pack object",
        stableKey: object.stable_key,
      });
    }

    for (const alias of [object.canonical_name, ...object.aliases]) {
      const aliasKey = `${object.object_type}:${alias.trim().toLowerCase()}`;
      const owner = aliases.get(aliasKey);
      if (owner && owner !== object.stable_key) {
        issues.push({
          code: "duplicate_alias",
          message: `${alias} already used by ${owner}`,
          stableKey: object.stable_key,
        });
      } else {
        aliases.set(aliasKey, object.stable_key);
      }
    }

    for (const ref of object.source_references) {
      if (!sourceIds.has(ref.source_id)) {
        issues.push({
          code: "missing_source_reference",
          message: ref.source_id,
          stableKey: object.stable_key,
        });
      }
    }
  }

  for (const object of pack.objects) {
    for (const relation of object.relations) {
      if (!keys.has(relation.target_stable_key)) {
        issues.push({
          code: "missing_relation_target",
          message: relation.target_stable_key,
          stableKey: object.stable_key,
        });
      }
    }
  }

  return issues;
}
