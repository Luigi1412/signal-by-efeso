import "server-only";
import { requireAuthUserId } from "@/server/session";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { loadAccountSignals } from "@/server/intelligence/load-signals";
import {
  getActiveAccountIntelligence,
  listAccountIntelligenceForWorkspace,
  listAccountIntelligenceHistory,
  listAccountIntelligenceSignals,
  listAccountIntelligenceThemes,
  listAccountTensions,
  listActiveEfesoFitsForCompany,
  listActiveEfesoFitsForWorkspace,
  listEfesoFitComponents,
  listSignalKnowledgeMatchesForCompany,
  type AccountIntelligenceRow,
} from "@/server/intelligence/persistence";
import { classifyTemporalState } from "@/server/intelligence/temporal";
import { deriveAccountThemes } from "@/server/intelligence/themes";
import { isOfferingObjectType } from "@/server/intelligence/taxonomy";
import type {
  AccountIntelligenceView,
  AccountThemeDraft,
  CompanyFitHeatmapCell,
  EfesoFitView,
  FitComponentDraft,
  GlobalAccountIntelligenceRow,
} from "@/server/intelligence/types";
import { getKnowledgeObject, listActiveKnowledgeObjects } from "@/server/knowledge/persistence";
import { getSignal, listCompaniesForWorkspace, listSignalsForWorkspace } from "@/server/signals/persistence";
import { loadKnowledgeFitTarget } from "./efeso-fit-service";

function isDemoOrigin(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { origin?: unknown }).origin === "demo_seed";
}

function nestedTag(row: {
  tag_id: string;
  knowledge_tags: { category: string; canonical_name: string } | { category: string; canonical_name: string }[] | null;
}): { category: string; canonicalName: string } | null {
  const nested = Array.isArray(row.knowledge_tags) ? row.knowledge_tags[0] : row.knowledge_tags;
  if (!nested) return null;
  return { category: nested.category, canonicalName: nested.canonical_name };
}

export async function resolvePersistedCompanyId(slug: string): Promise<string | null> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const companies = await listCompaniesForWorkspace(workspace.id);
  return companies.find((row) => row.slug === slug)?.id ?? null;
}

export async function getAccountIntelligence(companyId: string): Promise<AccountIntelligenceView | null> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const row = await getActiveAccountIntelligence(workspace.id, companyId);
  if (!row) return null;
  return hydrateAccountIntelligence(workspace.id, row);
}

export async function getAccountIntelligenceHistory(companyId: string): Promise<AccountIntelligenceView[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const rows = await listAccountIntelligenceHistory(workspace.id, companyId);
  const views: AccountIntelligenceView[] = [];
  for (const row of rows) {
    views.push(await hydrateAccountIntelligence(workspace.id, row));
  }
  return views;
}

export async function getAccountThemes(companyId: string): Promise<AccountThemeDraft[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const signals = (await loadAccountSignals(workspace.id, companyId)).filter((signal) => signal.status === "active");
  return deriveAccountThemes(signals);
}

export async function getCompanyEfesoFit(companyId: string): Promise<EfesoFitView[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const [fits, companies] = await Promise.all([
    listActiveEfesoFitsForCompany(workspace.id, companyId),
    listCompaniesForWorkspace(workspace.id),
  ]);
  const company = companies.find((row) => row.id === companyId);
  const views: EfesoFitView[] = [];
  for (const fit of fits) {
    views.push(await hydrateFit(workspace.id, fit, company?.display_name ?? companyId, company?.slug ?? ""));
  }
  const rank = (level: string) => (level === "high" ? 0 : level === "medium" ? 1 : 2);
  return views.sort((a, b) => rank(String(a.fitLevel)) - rank(String(b.fitLevel)));
}

export async function getCompanyFitHeatmap(): Promise<{
  companies: { id: string; name: string; slug: string }[];
  offerings: { id: string; name: string; objectType: string }[];
  cells: CompanyFitHeatmapCell[];
}> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const [companies, objects, fits] = await Promise.all([
    listCompaniesForWorkspace(workspace.id),
    listActiveKnowledgeObjects(workspace.id),
    listActiveEfesoFitsForWorkspace(workspace.id),
  ]);
  const offerings = objects
    .filter((object) => isOfferingObjectType(object.object_type) && object.status === "active")
    .sort((a, b) => {
      const rank = (type: string) => (type === "capability" ? 0 : type === "service" ? 1 : 2);
      return rank(a.object_type) - rank(b.object_type) || a.canonical_name.localeCompare(b.canonical_name);
    })
    .slice(0, 4);
  const withFits = companies.filter((company) => fits.some((fit) => fit.company_id === company.id));
  const previewCompanies = (withFits.length >= 3 ? withFits : companies.filter((company) => withFits.some((row) => row.id === company.id) || ["natura", "vale", "raizen"].includes(company.slug))).slice(0, 3);
  const cells: CompanyFitHeatmapCell[] = [];
  for (const company of previewCompanies) {
    for (const offering of offerings) {
      const fit = fits.find(
        (row) => row.company_id === company.id && row.knowledge_object_id === offering.id && row.status === "active",
      );
      cells.push({
        companyId: company.id,
        companyName: company.display_name,
        knowledgeObjectId: offering.id,
        knowledgeName: offering.canonical_name,
        knowledgeType: offering.object_type,
        fitLevel: fit?.fit_level ?? null,
        fitId: fit?.id ?? null,
      });
    }
  }
  return {
    companies: previewCompanies.map((company) => ({ id: company.id, name: company.display_name, slug: company.slug })),
    offerings: offerings.map((object) => ({ id: object.id, name: object.canonical_name, objectType: object.object_type })),
    cells,
  };
}

export async function getGlobalAccountIntelligence(): Promise<GlobalAccountIntelligenceRow[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const [companies, intelligence, signals, fits] = await Promise.all([
    listCompaniesForWorkspace(workspace.id),
    listAccountIntelligenceForWorkspace(workspace.id),
    listSignalsForWorkspace(workspace.id),
    listActiveEfesoFitsForWorkspace(workspace.id),
  ]);
  const objects = await listActiveKnowledgeObjects(workspace.id);
  const objectName = new Map(objects.map((row) => [row.id, row.canonical_name]));

  return companies.map((company) => {
    const active = intelligence.find((row) => row.company_id === company.id && row.status === "active");
    const companySignals = signals.filter((row) => row.company_id === company.id && row.status === "active");
    const latestMajor =
      [...companySignals].sort((a, b) => {
        const rank = (value: string) => (value === "high" ? 3 : value === "medium" ? 2 : 1);
        if (rank(b.importance) !== rank(a.importance)) return rank(b.importance) - rank(a.importance);
        return b.created_at.localeCompare(a.created_at);
      })[0] ?? null;
    const companyFits = fits.filter((row) => row.company_id === company.id);
    const topFit = [...companyFits].sort((a, b) => {
      const rank = (value: string) => (value === "high" ? 0 : value === "medium" ? 1 : 2);
      return rank(a.fit_level) - rank(b.fit_level);
    })[0];
    return {
      companyId: company.id,
      companyName: company.display_name,
      companySlug: company.slug,
      intelligenceStatus: active?.status ?? null,
      generatedAt: active?.generated_at ?? null,
      topThemes: [],
      latestMajorSignal: latestMajor
        ? { id: latestMajor.id, title: latestMajor.title, importance: latestMajor.importance }
        : null,
      topFit: topFit
        ? { knowledgeName: objectName.get(topFit.knowledge_object_id) ?? topFit.knowledge_object_id, fitLevel: topFit.fit_level }
        : null,
    };
  });
}

export async function getGlobalAccountIntelligenceWithThemes(): Promise<GlobalAccountIntelligenceRow[]> {
  const rows = await getGlobalAccountIntelligence();
  for (const row of rows) {
    const themes = await getAccountThemes(row.companyId);
    row.topThemes = themes.slice(0, 3).map((theme) => theme.canonicalName);
  }
  return rows;
}

async function hydrateAccountIntelligence(
  workspaceId: string,
  intelligence: AccountIntelligenceRow,
): Promise<AccountIntelligenceView> {
  const companies = await listCompaniesForWorkspace(workspaceId);
  const company = companies.find((item) => item.id === intelligence.company_id);
  const [links, tensions, themeRows] = await Promise.all([
    listAccountIntelligenceSignals(intelligence.id),
    listAccountTensions(intelligence.id),
    listAccountIntelligenceThemes(intelligence.id),
  ]);
  const signals = [];
  for (const link of links) {
    const signal = await getSignal(workspaceId, link.signal_id);
    if (!signal) continue;
    signals.push({
      id: signal.id,
      title: signal.title,
      signalType: signal.signal_type,
      assertionMode: signal.assertion_mode,
      importance: signal.importance,
      relationshipType: link.relationship_type,
      weight: link.weight,
      temporalState: classifyTemporalState({
        assertionMode: signal.assertion_mode,
        signalNature: signal.signal_nature,
        eventDate: signal.event_date,
      }),
    });
  }
  const signalTitle = new Map(signals.map((signal) => [signal.id, signal.title]));
  return {
    id: intelligence.id,
    companyId: intelligence.company_id,
    companyName: company?.display_name ?? intelligence.company_id,
    companySlug: company?.slug ?? "",
    status: intelligence.status,
    generatedAt: intelligence.generated_at,
    periodStart: intelligence.period_start,
    periodEnd: intelligence.period_end,
    headline: intelligence.headline,
    executiveSummary: intelligence.executive_summary,
    strategicDirection: intelligence.strategic_direction,
    pressureSummary: intelligence.pressure_summary,
    investmentSummary: intelligence.investment_summary,
    operatingContextSummary: intelligence.operating_context_summary,
    riskSummary: intelligence.risk_summary,
    changeSummary: intelligence.change_summary,
    sections: intelligence.sections ?? {},
    version: intelligence.version,
    originModelRunId: intelligence.origin_model_run_id,
    originCandidateId: intelligence.origin_candidate_id,
    supersedesId: intelligence.supersedes_account_intelligence_id,
    demoOrigin: isDemoOrigin(intelligence.metadata),
    signals,
    themes: themeRows.map((theme) => {
      const tag = nestedTag(theme);
      return {
        tagId: theme.tag_id,
        category: tag?.category ?? "CAPABILITY_DOMAIN",
        canonicalName: tag?.canonicalName ?? theme.tag_id,
        signalCount: theme.signal_count,
        weightedImportance: theme.weighted_importance as AccountThemeDraft["weightedImportance"],
        lastSeenAt: theme.last_seen_at,
        supportingSignalIds: [],
      };
    }),
    tensions: tensions.map((tension) => ({
      id: tension.id,
      signalAId: tension.signal_a_id,
      signalBId: tension.signal_b_id,
      signalATitle: signalTitle.get(tension.signal_a_id) ?? tension.signal_a_id,
      signalBTitle: signalTitle.get(tension.signal_b_id) ?? tension.signal_b_id,
      tensionType: tension.tension_type,
      explanation: tension.explanation,
      status: tension.status,
    })),
  };
}

async function hydrateFit(
  workspaceId: string,
  fit: Awaited<ReturnType<typeof listActiveEfesoFitsForCompany>>[number],
  companyName: string,
  companySlug: string,
): Promise<EfesoFitView> {
  const [components, knowledge, matches] = await Promise.all([
    listEfesoFitComponents(fit.id),
    getKnowledgeObject(workspaceId, fit.knowledge_object_id),
    listSignalKnowledgeMatchesForCompany(workspaceId, fit.knowledge_object_id),
  ]);
  const target = await loadKnowledgeFitTarget(workspaceId, fit.knowledge_object_id);
  const relatedSignals: EfesoFitView["relatedSignals"] = [];
  for (const match of matches) {
    const signal = await getSignal(workspaceId, match.signal_id);
    if (!signal || signal.company_id !== fit.company_id) continue;
    relatedSignals.push({
      id: signal.id,
      title: signal.title,
      matchType: match.match_type,
      matchStrength: match.match_strength,
    });
  }
  return {
    id: fit.id,
    companyId: fit.company_id,
    companyName,
    companySlug,
    knowledgeObjectId: fit.knowledge_object_id,
    knowledgeName: knowledge?.canonical_name ?? fit.knowledge_object_id,
    knowledgeType: knowledge?.object_type ?? "capability",
    status: fit.status,
    fitLevel: fit.fit_level,
    fitScore: fit.fit_score,
    fitReasonSummary: fit.fit_reason_summary,
    version: fit.version,
    originModelRunId: fit.origin_model_run_id,
    demoOrigin: isDemoOrigin(fit.metadata),
    components: components.map((row) => ({
      componentType: row.component_type as FitComponentDraft["componentType"],
      componentValue: row.component_value,
      contribution: row.contribution,
      explanation: row.explanation,
      sourceType: row.source_type as FitComponentDraft["sourceType"],
      sourceId: row.source_id,
    })),
    relatedSignals,
    relatedCases: (target?.relatedObjects ?? [])
      .filter((row) => row.objectType === "case")
      .map((row) => ({ id: row.id, name: row.canonicalName })),
    relatedMethodologies: (target?.relatedObjects ?? [])
      .filter((row) => row.objectType === "methodology")
      .map((row) => ({ id: row.id, name: row.canonicalName })),
  };
}

export { deriveAccountThemes };
