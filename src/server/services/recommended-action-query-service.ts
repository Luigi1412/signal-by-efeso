import "server-only";
import { requireAuthUserId } from "@/server/session";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getKnowledgeObject } from "@/server/knowledge/persistence";
import { listCompaniesForWorkspace } from "@/server/signals/persistence";
import { getOpportunity } from "@/server/opportunities/persistence";
import { getCompanyRelationship } from "@/server/services/relationship-query-service";
import {
  getRecommendedAction,
  listActionKnowledge,
  listActionRationales,
  listActiveActions,
  listActiveActionsForCompany,
  type RecommendedActionRow,
} from "@/server/recommended-actions/persistence";
import type { RecommendedActionDetail, RecommendedActionListItem, ActionRationaleDraft } from "@/server/recommended-actions/types";
import type { ActionPriority, ActionConfidenceTier } from "@/server/recommended-actions/taxonomy";
import type { OpportunityLevel } from "@/server/opportunities/taxonomy";
import type { RelationshipStrength } from "@/server/relationship/taxonomy";

function isDemoOrigin(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { origin?: unknown }).origin === "demo_seed";
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const URGENCY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export interface SearchRecommendedActionsFilters {
  companyId?: string | null;
  actionType?: string | null;
  priority?: string | null;
  status?: string | null;
  confidence?: string | null;
  opportunityId?: string | null;
  relationshipStrength?: string | null;
}

export async function searchRecommendedActions(
  filters: SearchRecommendedActionsFilters = {},
): Promise<RecommendedActionListItem[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const companies = await listCompaniesForWorkspace(workspace.id);
  const rows = filters.companyId
    ? await listActiveActionsForCompany(workspace.id, filters.companyId)
    : await listActiveActions(workspace.id);
  const items: RecommendedActionListItem[] = [];
  for (const row of rows) {
    if (row.status === "dismissed" && filters.status !== "dismissed") continue;
    items.push(await toListItem(workspace.id, row, companies));
  }
  const filtered = items.filter((item) => {
    if (filters.companyId && item.companyId !== filters.companyId) return false;
    if (filters.actionType && item.actionType !== filters.actionType) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.confidence && item.confidenceTier !== filters.confidence) return false;
    if (filters.opportunityId && item.opportunityId !== filters.opportunityId) return false;
    if (filters.relationshipStrength && item.relationshipStrength !== filters.relationshipStrength) return false;
    return true;
  });
  return filtered.sort((a, b) => {
    const priority = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (priority !== 0) return priority;
    const urgency =
      (URGENCY_RANK[a.opportunityUrgency ?? "low"] ?? 9) - (URGENCY_RANK[b.opportunityUrgency ?? "low"] ?? 9);
    if (urgency !== 0) return urgency;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function getRecommendedActionDetail(id: string): Promise<RecommendedActionDetail | null> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const row = await getRecommendedAction(workspace.id, id);
  if (!row) return null;
  const companies = await listCompaniesForWorkspace(workspace.id);
  const listItem = await toListItem(workspace.id, row, companies);
  const [rationales, knowledgeLinks] = await Promise.all([listActionRationales(row.id), listActionKnowledge(row.id)]);
  const knowledge = [];
  for (const link of knowledgeLinks) {
    const object = await getKnowledgeObject(workspace.id, link.knowledge_object_id);
    if (!object || object.status !== "active") continue;
    knowledge.push({ id: object.id, name: object.canonical_name, relationshipType: link.relationship_type });
  }
  return {
    ...listItem,
    originCandidateId: row.origin_action_candidate_id,
    originModelRunId: row.origin_model_run_id,
    supersedesActionId: row.supersedes_action_id,
    version: row.version,
    dismissalReason: row.dismissal_reason,
    rationaleBlocks: rationales.map((block) => ({
      rationaleType: block.rationale_type as ActionRationaleDraft["rationaleType"],
      statement: block.statement,
      sourceType: block.source_type,
      sourceId: block.source_id,
    })),
    knowledge,
  };
}

async function toListItem(
  workspaceId: string,
  row: RecommendedActionRow,
  companies: { id: string; display_name: string; slug: string }[],
): Promise<RecommendedActionListItem> {
  const company = companies.find((item) => item.id === row.company_id);
  const opportunity = row.opportunity_id ? await getOpportunity(workspaceId, row.opportunity_id) : null;
  const relationship = await getCompanyRelationship(row.company_id);
  const rationales = await listActionRationales(row.id);
  const uncertainty = rationales.find((block) => block.rationale_type === "uncertainty")?.statement ?? null;
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: company?.display_name ?? row.company_id,
    companySlug: company?.slug ?? "",
    title: row.title,
    rationale: row.rationale,
    status: row.status,
    actionType: row.action_type,
    priority: row.priority as ActionPriority,
    confidenceTier: row.confidence_tier as ActionConfidenceTier,
    opportunityTitle: opportunity?.title ?? null,
    opportunityId: opportunity?.id ?? null,
    opportunityUrgency: (opportunity?.urgency_level as OpportunityLevel | undefined) ?? null,
    relationshipStrength: relationship?.unavailable
      ? "unknown"
      : ((relationship?.derivedStrength ?? null) as RelationshipStrength | null),
    ownerName: relationship?.accountOwner?.person.displayName ?? null,
    uncertaintyStatement: uncertainty,
    demoOrigin: isDemoOrigin(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
