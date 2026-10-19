import "server-only";
import { requireAuthUserId } from "@/server/session";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getKnowledgeObject } from "@/server/knowledge/persistence";
import { getSignal, listCompaniesForWorkspace } from "@/server/signals/persistence";
import { listActiveEfesoFitsForCompany } from "@/server/intelligence/persistence";
import {
  getOpportunity,
  listActiveOpportunities,
  listActiveOpportunitiesForCompany,
  listOpportunityFits,
  listOpportunityKnowledge,
  listOpportunityRationales,
  listOpportunitySignals,
  type OpportunityRow,
} from "@/server/opportunities/persistence";
import type { OpportunityDetail, OpportunityListItem } from "@/server/opportunities/types";
import type { OpportunityLevel, OpportunityType, OpportunityMaturity, OpportunityConfidenceTier } from "@/server/opportunities/taxonomy";
import { isOpportunityType } from "@/server/opportunities/taxonomy";

function isDemoOrigin(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { origin?: unknown }).origin === "demo_seed";
}

const RELEVANCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const URGENCY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export interface SearchOpportunitiesFilters {
  companyId?: string | null;
  opportunityType?: string | null;
  relevanceLevel?: string | null;
  urgencyLevel?: string | null;
  maturity?: string | null;
  confidenceTier?: string | null;
  geography?: string | null;
  status?: string | null;
  query?: string | null;
}

export async function searchOpportunities(filters: SearchOpportunitiesFilters = {}): Promise<OpportunityListItem[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const companies = await listCompaniesForWorkspace(workspace.id);
  const rows = await listActiveOpportunities(workspace.id);
  const items: OpportunityListItem[] = [];
  for (const row of rows) {
    if (row.status === "dismissed") continue;
    const item = await toListItem(workspace.id, row, companies);
    items.push(item);
  }
  const query = (filters.query ?? "").trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (filters.companyId && item.companyId !== filters.companyId) return false;
    if (filters.opportunityType && item.opportunityType !== filters.opportunityType) return false;
    if (filters.relevanceLevel && item.relevanceLevel !== filters.relevanceLevel) return false;
    if (filters.urgencyLevel && item.urgencyLevel !== filters.urgencyLevel) return false;
    if (filters.maturity && item.maturity !== filters.maturity) return false;
    if (filters.confidenceTier && item.confidenceTier !== filters.confidenceTier) return false;
    if (filters.geography && (item.geography ?? "").toLowerCase() !== filters.geography.toLowerCase()) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (query) {
      const haystack = `${item.title} ${item.summary} ${item.companyName} ${item.primaryCapability ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  return filtered.sort((a, b) => {
    const relevance = (RELEVANCE_RANK[a.relevanceLevel] ?? 9) - (RELEVANCE_RANK[b.relevanceLevel] ?? 9);
    if (relevance !== 0) return relevance;
    const urgency = (URGENCY_RANK[a.urgencyLevel] ?? 9) - (URGENCY_RANK[b.urgencyLevel] ?? 9);
    if (urgency !== 0) return urgency;
    const recency = b.createdAt.localeCompare(a.createdAt);
    if (recency !== 0) return recency;
    return (b.triggerSignalTitle ? 1 : 0) - (a.triggerSignalTitle ? 1 : 0);
  });
}

export async function getCompanyOpportunities(companyId: string): Promise<OpportunityDetail[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const rows = await listActiveOpportunitiesForCompany(workspace.id, companyId);
  const details: OpportunityDetail[] = [];
  for (const row of rows) {
    const detail = await getOpportunityDetail(row.id);
    if (detail) details.push(detail);
  }
  return details;
}

export async function getOpportunityDetail(id: string): Promise<OpportunityDetail | null> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const row = await getOpportunity(workspace.id, id);
  if (!row || (row.status !== "active" && row.status !== "archived" && row.status !== "dismissed")) return null;
  const companies = await listCompaniesForWorkspace(workspace.id);
  const listItem = await toListItem(workspace.id, row, companies);
  const [signalLinks, fitLinks, knowledgeLinks, rationales] = await Promise.all([
    listOpportunitySignals(row.id),
    listOpportunityFits(row.id),
    listOpportunityKnowledge(row.id),
    listOpportunityRationales(row.id),
  ]);
  const signals = [];
  for (const link of signalLinks) {
    const signal = await getSignal(workspace.id, link.signal_id);
    if (!signal) continue;
    signals.push({
      id: signal.id,
      title: signal.title,
      signalType: signal.signal_type,
      relationshipType: link.relationship_type,
      assertionMode: signal.assertion_mode,
      importance: signal.importance,
    });
  }
  const fits = [];
  for (const link of fitLinks) {
    const companyFits = await listActiveEfesoFitsForCompany(workspace.id, row.company_id);
    const fit = companyFits.find((item) => item.id === link.efeso_fit_id);
    const knowledge = fit ? await getKnowledgeObject(workspace.id, fit.knowledge_object_id) : null;
    fits.push({
      id: link.efeso_fit_id,
      knowledgeName: knowledge?.canonical_name ?? link.efeso_fit_id,
      fitLevel: fit?.fit_level ?? "",
      relationshipType: link.relationship_type,
      reason: fit?.fit_reason_summary ?? "",
    });
  }
  const knowledge = [];
  for (const link of knowledgeLinks) {
    const object = await getKnowledgeObject(workspace.id, link.knowledge_object_id);
    if (!object || object.status !== "active") continue;
    knowledge.push({
      id: object.id,
      name: object.canonical_name,
      objectType: object.object_type,
      relationshipType: link.relationship_type,
      description: object.short_description,
    });
  }
  return {
    ...listItem,
    accountIntelligenceId: row.account_intelligence_id,
    primaryEfesoFitId: row.primary_efeso_fit_id,
    originCandidateId: row.origin_opportunity_candidate_id,
    originModelRunId: row.origin_model_run_id,
    parentOpportunityId: row.parent_opportunity_id,
    supersedesOpportunityId: row.supersedes_opportunity_id,
    version: row.version,
    dismissalReason: row.dismissal_reason,
    rationaleBlocks: rationales.map((block) => ({
      rationaleType: block.rationale_type as OpportunityDetail["rationaleBlocks"][number]["rationaleType"],
      statement: block.statement,
      sourceType: block.source_type,
      sourceId: block.source_id,
    })),
    signals,
    fits,
    knowledge,
  };
}

export async function getTopOpportunityByCompany(): Promise<
  { companyId: string; companyName: string; companySlug: string; topOpportunity: OpportunityListItem | null }[]
> {
  const items = await searchOpportunities({ status: "active" });
  const byCompany = new Map<string, OpportunityListItem[]>();
  for (const item of items) {
    const list = byCompany.get(item.companyId) ?? [];
    list.push(item);
    byCompany.set(item.companyId, list);
  }
  return [...byCompany.values()].map((list) => ({
    companyId: list[0].companyId,
    companyName: list[0].companyName,
    companySlug: list[0].companySlug,
    topOpportunity: list[0] ?? null,
  }));
}

async function toListItem(
  workspaceId: string,
  row: OpportunityRow,
  companies: { id: string; display_name: string; slug: string }[],
): Promise<OpportunityListItem> {
  const company = companies.find((item) => item.id === row.company_id);
  const [signalLinks, fitLinks, rationales] = await Promise.all([
    listOpportunitySignals(row.id),
    listOpportunityFits(row.id),
    listOpportunityRationales(row.id),
  ]);
  const trigger = signalLinks.find((link) => link.relationship_type === "trigger");
  const triggerSignal = trigger ? await getSignal(workspaceId, trigger.signal_id) : null;
  const primaryFitLink = fitLinks.find((link) => link.relationship_type === "primary");
  let primaryCapability: string | null = null;
  if (primaryFitLink) {
    const fits = await listActiveEfesoFitsForCompany(workspaceId, row.company_id);
    const fit = fits.find((item) => item.id === primaryFitLink.efeso_fit_id);
    if (fit) {
      const knowledge = await getKnowledgeObject(workspaceId, fit.knowledge_object_id);
      primaryCapability = knowledge?.canonical_name ?? null;
    }
  }
  const uncertainty = rationales.find((block) => block.rationale_type === "uncertainty")?.statement ?? null;
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: company?.display_name ?? row.company_id,
    companySlug: company?.slug ?? "",
    title: row.title,
    summary: row.summary,
    status: row.status,
    opportunityType: isOpportunityType(row.opportunity_type) ? (row.opportunity_type as OpportunityType) : row.opportunity_type,
    maturity: row.maturity as OpportunityMaturity,
    relevanceLevel: row.relevance_level as OpportunityLevel,
    urgencyLevel: row.urgency_level as OpportunityLevel,
    confidenceTier: row.confidence_tier as OpportunityConfidenceTier,
    assertionMode: row.assertion_mode,
    geography: row.geography,
    primaryCapability,
    triggerSignalTitle: triggerSignal?.title ?? null,
    triggerSignalId: triggerSignal?.id ?? null,
    uncertaintyStatement: uncertainty,
    demoOrigin: isDemoOrigin(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
