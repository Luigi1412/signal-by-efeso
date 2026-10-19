import "server-only";
import { getBlockById } from "@/server/extraction/pipeline-persistence";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { requireAuthUserId } from "@/server/session";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { isSupabaseConfigured } from "@/lib/supabase/env";
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

async function loadSearchRecords(workspaceId: string): Promise<KnowledgeSearchRecord[]> {
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
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const records = await loadSearchRecords(workspace.id);
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
  }));
}

export async function getRelevantEfesoKnowledge(
  context: RelevantKnowledgeContext,
): Promise<RelevantEfesoKnowledgeHit[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const records = await loadSearchRecords(workspace.id);
  const hits = matchRelevantKnowledge(records, context);
  const results: RelevantEfesoKnowledgeHit[] = [];
  for (const hit of hits) {
    const detail = await assembleDetail(workspace.id, hit.record.id);
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
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  return assembleDetail(workspace.id, id);
}

async function assembleDetail(workspaceId: string, id: string): Promise<EfesoKnowledgeDetail | null> {
  const object = await getKnowledgeObject(workspaceId, id);
  if (!object) return null;
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
    evidence,
    provenance: {
      snapshotId: object.source_snapshot_id,
      candidateId: object.origin_candidate_id,
      modelRunId: object.origin_model_run_id,
      validations,
    },
    demoOrigin: isDemoOrigin(object.metadata),
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
