import "server-only";
import { requireAuthUserId } from "@/server/session";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase/env";
import { routes } from "@/lib/routes";
import { listCompaniesForWorkspace, listSignalsForWorkspace } from "@/server/signals/persistence";
import { listActiveOpportunities } from "@/server/opportunities/persistence";
import { listActiveActions } from "@/server/recommended-actions/persistence";
import { listActiveAccountRelationships } from "@/server/relationship/persistence";
import {
  listAccountIntelligenceForWorkspace,
  listActiveEfesoFitsForWorkspace,
} from "@/server/intelligence/persistence";
import { listActiveKnowledgeObjects } from "@/server/knowledge/persistence";
import {
  formatSignalSummaryForDisplay,
  formatSignalTitleForDisplay,
  signalMovementCategory,
  type SignalMovementCategory,
} from "@/lib/signal-display";

function isDemoOrigin(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { origin?: unknown }).origin === "demo_seed";
}

const FIT_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const RELEVANCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export interface ExecutiveLinkItem {
  id: string;
  title: string;
  summary: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  href: string;
  meta: string | null;
  demoOrigin: boolean;
  updatedAt: string;
}

export interface ExecutiveAccountRow {
  companyId: string;
  companySlug: string;
  companyName: string;
  industry: string | null;
  latestSignalTitle: string | null;
  latestSignalDate: string | null;
  intelligenceHeadline: string | null;
  topFitName: string | null;
  topFitLevel: string | null;
  topOpportunityTitle: string | null;
  relationshipStrength: string;
  nextActionTitle: string | null;
  demoOrigin: boolean;
  updatedAt: string | null;
}

export interface ExecutiveDashboard {
  signalCount: number;
  opportunityCount: number;
  actionCount: number;
  companyCount: number;
  highImportanceSignals: ExecutiveLinkItem[];
  highRelevanceOpportunities: ExecutiveLinkItem[];
  priorityActions: ExecutiveLinkItem[];
  accountsMoving: ExecutiveLinkItem[];
  unknownRelationships: ExecutiveLinkItem[];
  recentActivity: ExecutiveLinkItem[];
  accounts: ExecutiveAccountRow[];
  attentionAccounts: ExecutiveAccountRow[];
  radarThemes: { category: SignalMovementCategory; count: number }[];
}

export async function getExecutiveDashboard(): Promise<ExecutiveDashboard> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();

  const [companies, signals, opportunities, actions, relationships, intelligence, fits, knowledge] = await Promise.all([
    listCompaniesForWorkspace(workspace.id),
    listSignalsForWorkspace(workspace.id),
    listActiveOpportunities(workspace.id),
    listActiveActions(workspace.id),
    listActiveAccountRelationships(workspace.id),
    listAccountIntelligenceForWorkspace(workspace.id),
    listActiveEfesoFitsForWorkspace(workspace.id),
    listActiveKnowledgeObjects(workspace.id),
  ]);

  const companyById = new Map(companies.map((row) => [row.id, row]));
  const knowledgeById = new Map(knowledge.map((row) => [row.id, row]));
  const relationshipByCompany = new Map(relationships.map((row) => [row.company_id, row]));
  const intelligenceByCompany = new Map<string, (typeof intelligence)[number]>();
  for (const row of intelligence) {
    if (row.status !== "active") continue;
    if (!intelligenceByCompany.has(row.company_id)) intelligenceByCompany.set(row.company_id, row);
  }

  const allowDemo = isDemoMode();
  const activeSignals = signals
    .filter((row) => row.status === "active")
    .filter((row) => allowDemo || !isDemoOrigin(row.metadata));
  const activeOpportunities = opportunities
    .filter((row) => row.status === "active")
    .filter((row) => allowDemo || !isDemoOrigin(row.metadata));
  const activeActions = actions
    .filter((row) => row.status === "active")
    .filter((row) => allowDemo || !isDemoOrigin(row.metadata));

  const highImportanceSignals = activeSignals
    .filter((row) => row.importance === "high")
    .sort((a, b) => (b.event_date ?? b.created_at).localeCompare(a.event_date ?? a.created_at))
    .slice(0, 5)
    .flatMap((row) => {
      const company = companyById.get(row.company_id);
      if (!company) return [];
      return [
        {
          id: row.id,
          title: formatSignalTitleForDisplay(row.title),
          summary: formatSignalSummaryForDisplay(row.summary),
          companyId: company.id,
          companyName: company.display_name,
          companySlug: company.slug,
          href: routes.company(company.slug),
          meta: row.event_date,
          demoOrigin: isDemoOrigin(row.metadata),
          updatedAt: row.updated_at,
        } satisfies ExecutiveLinkItem,
      ];
    });

  const highRelevanceOpportunities = [...activeOpportunities]
    .filter((row) => row.relevance_level === "high")
    .sort((a, b) => (RELEVANCE_RANK[a.relevance_level] ?? 9) - (RELEVANCE_RANK[b.relevance_level] ?? 9) || b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .flatMap((row) => {
      const company = companyById.get(row.company_id);
      if (!company) return [];
      return [
        {
          id: row.id,
          title: row.title,
          summary: row.summary,
          companyId: company.id,
          companyName: company.display_name,
          companySlug: company.slug,
          href: routes.companyTab(company.slug, "opportunities"),
          meta: row.relevance_level,
          demoOrigin: isDemoOrigin(row.metadata),
          updatedAt: row.updated_at,
        } satisfies ExecutiveLinkItem,
      ];
    });

  const priorityActions = [...activeActions]
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) || b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .flatMap((row) => {
      const company = companyById.get(row.company_id);
      if (!company) return [];
      return [
        {
          id: row.id,
          title: row.title,
          summary: row.rationale,
          companyId: company.id,
          companyName: company.display_name,
          companySlug: company.slug,
          href: routes.companyTab(company.slug, "actions"),
          meta: row.priority,
          demoOrigin: isDemoOrigin(row.metadata),
          updatedAt: row.updated_at,
        } satisfies ExecutiveLinkItem,
      ];
    });

  const latestSignalByCompany = new Map<string, (typeof activeSignals)[number]>();
  for (const row of [...activeSignals].sort((a, b) => (b.event_date ?? b.created_at).localeCompare(a.event_date ?? a.created_at))) {
    if (!latestSignalByCompany.has(row.company_id)) latestSignalByCompany.set(row.company_id, row);
  }

  const accountsMoving = [...latestSignalByCompany.values()]
    .sort((a, b) => (b.event_date ?? b.created_at).localeCompare(a.event_date ?? a.created_at))
    .slice(0, 5)
    .flatMap((row) => {
      const company = companyById.get(row.company_id);
      if (!company) return [];
      return [
        {
          id: company.id,
          title: company.display_name,
          summary: formatSignalTitleForDisplay(row.title),
          companyId: company.id,
          companyName: company.display_name,
          companySlug: company.slug,
          href: `/companies/${company.slug}`,
          meta: row.event_date ?? row.created_at,
          demoOrigin: isDemoOrigin(row.metadata),
          updatedAt: row.updated_at,
        } satisfies ExecutiveLinkItem,
      ];
    });

  const unknownRelationships = companies
    .filter((company) => {
      const rel = relationshipByCompany.get(company.id);
      return !rel || rel.relationship_strength === "unknown";
    })
    .slice(0, 6)
    .map((company) => ({
      id: company.id,
      title: company.display_name,
      summary: company.industry ?? "",
      companyId: company.id,
      companyName: company.display_name,
      companySlug: company.slug,
      href: `/companies/${company.slug}/actions`,
      meta: null,
      demoOrigin: false,
      updatedAt: company.updated_at,
    }));

  const recentActivity = [
    ...activeSignals.map((row) => ({ kind: "signal" as const, at: row.updated_at, row })),
    ...activeOpportunities.map((row) => ({ kind: "opportunity" as const, at: row.updated_at, row })),
    ...activeActions.map((row) => ({ kind: "action" as const, at: row.updated_at, row })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8)
    .flatMap((item) => {
      const company = companyById.get(item.row.company_id);
      if (!company) return [];
      const title =
        item.kind === "signal"
          ? formatSignalTitleForDisplay((item.row as (typeof activeSignals)[number]).title)
          : item.kind === "opportunity"
            ? (item.row as (typeof activeOpportunities)[number]).title
            : (item.row as (typeof activeActions)[number]).title;
      const href =
        item.kind === "signal"
          ? `/signals?signal=${item.row.id}`
          : item.kind === "opportunity"
            ? `/opportunities?opportunity=${item.row.id}`
            : `/companies/${company.slug}/actions`;
      return [
        {
          id: `${item.kind}-${item.row.id}`,
          title,
          summary: company.display_name,
          companyId: company.id,
          companyName: company.display_name,
          companySlug: company.slug,
          href,
          meta: item.kind,
          demoOrigin: isDemoOrigin(item.row.metadata),
          updatedAt: item.at,
        } satisfies ExecutiveLinkItem,
      ];
    });

  const opportunitiesByCompany = new Map<string, (typeof activeOpportunities)[number]>();
  for (const row of [...activeOpportunities].sort((a, b) => (RELEVANCE_RANK[a.relevance_level] ?? 9) - (RELEVANCE_RANK[b.relevance_level] ?? 9))) {
    if (!opportunitiesByCompany.has(row.company_id)) opportunitiesByCompany.set(row.company_id, row);
  }
  const actionsByCompany = new Map<string, (typeof activeActions)[number]>();
  for (const row of [...activeActions].sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9))) {
    if (!actionsByCompany.has(row.company_id)) actionsByCompany.set(row.company_id, row);
  }
  const fitsByCompany = new Map<string, { name: string; level: string }>();
  for (const fit of [...fits].sort((a, b) => (FIT_RANK[a.fit_level] ?? 9) - (FIT_RANK[b.fit_level] ?? 9))) {
    if (fitsByCompany.has(fit.company_id)) continue;
    const object = knowledgeById.get(fit.knowledge_object_id);
    fitsByCompany.set(fit.company_id, { name: object?.canonical_name ?? fit.knowledge_object_id, level: fit.fit_level });
  }

  const radarThemes = [...activeSignals.reduce((counts, row) => {
    const category = signalMovementCategory(row.signal_type);
    if (category === "other") return counts;
    counts.set(category, (counts.get(category) ?? 0) + 1);
    return counts;
  }, new Map<SignalMovementCategory, number>())]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([category, count]) => ({ category, count }));

  const accounts: ExecutiveAccountRow[] = companies.map((company) => {
    const latest = latestSignalByCompany.get(company.id);
    const intel = intelligenceByCompany.get(company.id);
    const fit = fitsByCompany.get(company.id);
    const opportunity = opportunitiesByCompany.get(company.id);
    const action = actionsByCompany.get(company.id);
    const relationship = relationshipByCompany.get(company.id);
    return {
      companyId: company.id,
      companySlug: company.slug,
      companyName: company.display_name,
      industry: company.industry,
      latestSignalTitle: latest ? formatSignalTitleForDisplay(latest.title) : null,
      latestSignalDate: latest?.event_date ?? null,
      intelligenceHeadline: intel?.headline ?? null,
      topFitName: fit?.name ?? null,
      topFitLevel: fit?.level ?? null,
      topOpportunityTitle: opportunity?.title ?? null,
      relationshipStrength: relationship?.relationship_strength ?? "unknown",
      nextActionTitle: action?.title ?? null,
      demoOrigin: Boolean(latest && isDemoOrigin(latest.metadata)),
      updatedAt: intel?.updated_at ?? latest?.updated_at ?? company.updated_at,
    };
  });

  const attentionAccounts = [...accounts]
    .filter((row) => allowDemo || !row.demoOrigin)
    .filter((row) => Boolean(row.latestSignalTitle) || Boolean(row.topOpportunityTitle) || Boolean(row.intelligenceHeadline))
    .sort((left, right) => attentionWeight(right) - attentionWeight(left) || (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""))
    .slice(0, 5);

  return {
    signalCount: activeSignals.length,
    opportunityCount: activeOpportunities.length,
    actionCount: activeActions.length,
    companyCount: companies.length,
    highImportanceSignals,
    highRelevanceOpportunities,
    priorityActions,
    accountsMoving,
    unknownRelationships,
    recentActivity,
    accounts,
    attentionAccounts,
    radarThemes,
  };
}

function attentionWeight(row: ExecutiveAccountRow): number {
  return (
    (row.latestSignalTitle ? 1 : 0) +
    (row.topOpportunityTitle ? 1 : 0) +
    (row.intelligenceHeadline ? 1 : 0) +
    (row.nextActionTitle ? 1 : 0)
  );
}
