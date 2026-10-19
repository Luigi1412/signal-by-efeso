import "server-only";
import { getBlockById } from "@/server/extraction/pipeline-persistence";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { requireAuthUserId } from "@/server/session";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireEfesoAccess, requireEfesoAdmin } from "@/server/access/require-efeso-access";
import { isMemberVisibleKnowledge, knowledgeOrigin } from "@/server/knowledge/governance";
import {
  getKnowledgeObject,
  listAliasesForObject,
  listAliasesForWorkspace,
  listClaimsByIds,
  listKnowledgeCandidateEvidence,
  listKnowledgeObjectsForWorkspace,
  listKnowledgeValidations,
  listObjectClaims,
  listObjectRelations,
  listObjectTags,
  listTags,
  updateKnowledgeGovernance,
} from "@/server/knowledge/persistence";
import {
  matchRelevantKnowledge,
  rankKnowledgeSearch,
  type KnowledgeSearchFilters,
  type KnowledgeSearchRecord,
  type RelevantKnowledgeContext,
} from "@/server/knowledge/search-rank";
import type {
  EfesoKnowledgeDetail,
  EfesoKnowledgeListItem,
  RelevantEfesoKnowledgeHit,
} from "@/types/efeso-knowledge";

function tagName(row: {
  knowledge_tags: { category: string; canonical_name: string } | { category: string; canonical_name: string }[] | null;
}): { category: string; canonicalName: string } | null {
  const nested = Array.isArray(row.knowledge_tags) ? row.knowledge_tags[0] : row.knowledge_tags;
  if (!nested) return null;
  return { category: nested.category, canonicalName: nested.canonical_name };
}

function catalogSectionOf(object: {
  object_type: string;
  metadata: Record<string, unknown>;
}): string | null {
  const fromMeta = object.metadata?.catalog_section;
  if (typeof fromMeta === "string") return fromMeta;
  if (object.object_type === "capability" || object.object_type === "service") return "what_we_do";
  if (object.object_type === "methodology") return "how_we_work";
  if (object.object_type === "industry_expertise") return "industries";
  if (object.object_type === "case" || object.object_type === "result") return "cases_and_results";
  if (object.object_type === "credential" || object.object_type === "testimonial") return "credentials";
  if (object.object_type === "concept") return "problems_we_solve";
  return null;
}

async function loadSearchRecords(workspaceId: string, memberView: boolean): Promise<KnowledgeSearchRecord[]> {
  const [objects, aliases, catalog] = await Promise.all([
    listKnowledgeObjectsForWorkspace(workspaceId),
    listAliasesForWorkspace(workspaceId),
    listTags(),
  ]);
  void catalog;
  const aliasesByObject = new Map<string, string[]>();
  for (const alias of aliases) {
    const list = aliasesByObject.get(alias.knowledge_object_id) ?? [];
    list.push(alias.alias);
    aliasesByObject.set(alias.knowledge_object_id, list);
  }
  const records: KnowledgeSearchRecord[] = [];
  for (const object of objects) {
    if (
      memberView &&
      !isMemberVisibleKnowledge({
        visibilityLevel: object.visibility_level ?? "efeso_member",
        confidentialityLevel: object.confidentiality_level ?? "internal",
        approvedForDisplay: object.approved_for_display ?? true,
        commercialTermsPresent: object.commercial_terms_present ?? false,
        knowledgeNature: object.knowledge_nature ?? "institutional_fact",
      })
    ) {
      continue;
    }
    const tagRows = await listObjectTags(object.id);
    records.push({
      id: object.id,
      canonicalName: object.canonical_name,
      normalizedName: object.normalized_name,
      objectType: object.object_type,
      shortDescription: object.short_description,
      status: object.status,
      aliases: aliasesByObject.get(object.id) ?? [],
      tags: tagRows.map(tagName).filter((tag): tag is { category: string; canonicalName: string } => Boolean(tag)),
      demoOrigin: isDemoOrigin(object.metadata),
      origin: knowledgeOrigin(object.metadata),
      catalogSection: catalogSectionOf(object),
      approvedForDisplay: object.approved_for_display ?? true,
      visibilityLevel: object.visibility_level ?? "efeso_member",
    });
  }
  return records;
}

function isDemoOrigin(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { origin?: unknown }).origin === "demo_seed";
}

export async function searchEfesoKnowledge(
  filters: KnowledgeSearchFilters,
): Promise<EfesoKnowledgeListItem[]> {
  await requireEfesoAccess();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const records = await loadSearchRecords(workspace.id, true);
  return rankKnowledgeSearch(records, filters).map((hit) => ({
    id: hit.record.id,
    canonicalName: hit.record.canonicalName,
    objectType: hit.record.objectType,
    shortDescription: hit.record.shortDescription,
    status: hit.record.status,
    rank: hit.rank,
    matchedBecause: hit.matchedBecause,
    tags: hit.record.tags,
    demoOrigin: hit.record.demoOrigin,
    catalogSection: hit.record.catalogSection,
    origin: hit.record.origin,
  }));
}

export async function getRelevantEfesoKnowledge(
  context: RelevantKnowledgeContext,
): Promise<RelevantEfesoKnowledgeHit[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const access = await requireEfesoAccess();
  const records = await loadSearchRecords(workspace.id, !access.isAdmin);
  const hits = matchRelevantKnowledge(records, context);
  const results: RelevantEfesoKnowledgeHit[] = [];
  for (const hit of hits) {
    const detail = await assembleDetail(workspace.id, hit.record.id, access.isAdmin);
    if (!detail || detail.status !== "active") continue;
    results.push({
      knowledgeObject: {
        id: detail.id,
        canonicalName: detail.canonicalName,
        objectType: detail.objectType,
        shortDescription: detail.shortDescription,
      },
      matchedBecause: hit.matchedBecause,
      claims: detail.claims,
      evidence: detail.evidence.map((row) => ({ exactQuote: row.exactQuote, snapshotId: row.snapshotId })),
    });
  }
  return results;
}

export async function getEfesoKnowledgeObject(id: string): Promise<EfesoKnowledgeDetail | null> {
  await requireEfesoAccess();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  return assembleDetail(workspace.id, id, false);
}

async function assembleDetail(workspaceId: string, id: string, isAdmin: boolean): Promise<EfesoKnowledgeDetail | null> {
  const object = await getKnowledgeObject(workspaceId, id);
  if (!object) return null;
  if (
    !isAdmin &&
    !isMemberVisibleKnowledge({
      visibilityLevel: object.visibility_level ?? "efeso_member",
      confidentialityLevel: object.confidentiality_level ?? "internal",
      approvedForDisplay: object.approved_for_display ?? true,
      commercialTermsPresent: object.commercial_terms_present ?? false,
      knowledgeNature: object.knowledge_nature ?? "institutional_fact",
    })
  ) {
    return null;
  }
  const [aliases, tagRows, relations, claimLinks] = await Promise.all([
    listAliasesForObject(object.id),
    listObjectTags(object.id),
    listObjectRelations(object.id),
    listObjectClaims(object.id),
  ]);
  const claims = await listClaimsByIds(claimLinks.map((row) => row.claim_id));
  const claimById = new Map(claims.map((row) => [row.id, row.statement]));
  const evidence = [];
  let validations: { validatorCode: string; result: string; message: string | null }[] = [];
  if (object.origin_candidate_id) {
    const rows = await listKnowledgeCandidateEvidence(object.origin_candidate_id);
    for (const row of rows) {
      const block = await getBlockById(row.source_content_block_id);
      evidence.push({
        exactQuote: row.exact_quote,
        pageNumber: block?.page_number ?? null,
        sectionTitle: block?.section_title ?? null,
        snapshotId: object.source_snapshot_id,
        blockId: row.source_content_block_id,
      });
    }
    validations = (await listKnowledgeValidations(object.origin_candidate_id)).map((row) => ({
      validatorCode: row.validator_code,
      result: row.result,
      message: row.message,
    }));
  }

  return {
    id: object.id,
    canonicalName: object.canonical_name,
    objectType: object.object_type,
    shortDescription: object.short_description,
    status: object.status,
    sourceSnapshotId: object.source_snapshot_id,
    primaryContentBlockId: object.primary_content_block_id,
    originModelRunId: object.origin_model_run_id,
    originCandidateId: object.origin_candidate_id,
    supersedesObjectId: object.supersedes_object_id,
    createdAt: object.created_at,
    updatedAt: object.updated_at,
    aliases: aliases.map((row) => row.alias),
    tags: tagRows.map(tagName).filter((tag): tag is { category: string; canonicalName: string } => Boolean(tag)),
    relations: relations.map((row) => ({
      id: row.id,
      sourceObjectId: row.source_object_id,
      targetObjectId: row.target_object_id,
      relationType: row.relation_type,
      status: row.status,
    })),
    claims: claimLinks.map((row) => ({
      id: row.claim_id,
      statement: claimById.get(row.claim_id) ?? row.claim_id,
      relationshipType: row.relationship_type,
    })),
    evidence: isAdmin ? evidence : evidence.map((row) => ({ ...row, snapshotId: "", blockId: "" })),
    provenance: isAdmin
      ? {
          snapshotId: object.source_snapshot_id,
          candidateId: object.origin_candidate_id,
          modelRunId: object.origin_model_run_id,
          validations,
        }
      : { snapshotId: "", candidateId: null, modelRunId: null, validations: [] },
    demoOrigin: isDemoOrigin(object.metadata),
    catalogSection: catalogSectionOf(object),
    origin: knowledgeOrigin(object.metadata),
    showProvenance: isAdmin,
  };
}

export async function listTaxonomyOptions() {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const tags = await listTags();
  return {
    industries: tags.filter((tag) => tag.category === "INDUSTRY").map((tag) => tag.canonical_name),
    capabilities: tags.filter((tag) => tag.category === "CAPABILITY_DOMAIN").map((tag) => tag.canonical_name),
    problems: tags.filter((tag) => tag.category === "BUSINESS_PROBLEM").map((tag) => tag.canonical_name),
    geographies: tags.filter((tag) => tag.category === "GEOGRAPHY").map((tag) => tag.canonical_name),
  };
}

export async function listKnowledgeGovernanceCatalog() {
  await requireEfesoAdmin();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const objects = await listKnowledgeObjectsForWorkspace(workspace.id);
  return objects.map((object) => ({
    id: object.id,
    canonicalName: object.canonical_name,
    objectType: object.object_type,
    status: object.status,
    visibilityLevel: object.visibility_level ?? "efeso_member",
    confidentialityLevel: object.confidentiality_level ?? "internal",
    knowledgeNature: object.knowledge_nature ?? "institutional_fact",
    outcomeStatus: object.outcome_status ?? "not_applicable",
    approvedForMatching: object.approved_for_matching ?? true,
    approvedForDisplay: object.approved_for_display ?? true,
    sourceDocumentType: object.source_document_type ?? null,
    origin: knowledgeOrigin(object.metadata),
    catalogSection: catalogSectionOf(object),
  }));
}

export async function reviewKnowledgeObject(input: {
  id: string;
  action: "approve" | "archive";
}) {
  const access = await requireEfesoAccess();
  if (!access.isAdmin) throw new Error("FORBIDDEN");
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  await updateKnowledgeGovernance({
    workspaceId: access.workspaceId,
    id: input.id,
    status: input.action === "archive" ? "archived" : "active",
    approvedForDisplay: input.action === "approve" ? true : undefined,
    approvedForMatching: input.action === "approve" ? true : undefined,
  });
}
