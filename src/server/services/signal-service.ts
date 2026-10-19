import "server-only";
import { requireAuthUserId } from "@/server/session";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { rankSignalSearch } from "@/server/signals/search";
import {
  getSignal,
  listClaimsByIds,
  listCompaniesForWorkspace,
  listEvidenceQuotesForClaims,
  listSignalClaims,
  listSignalCompanies,
  listSignalTags,
  listSignalValidations,
  listSignalsForWorkspace,
} from "@/server/signals/persistence";
import type { SignalDetail, SignalListItem, SignalSearchFilters } from "@/server/signals/types";

function isDemoOrigin(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { origin?: unknown }).origin === "demo_seed";
}

function tagName(row: {
  knowledge_tags: { category: string; canonical_name: string } | { category: string; canonical_name: string }[] | null;
}): { category: string; canonicalName: string } | null {
  const nested = Array.isArray(row.knowledge_tags) ? row.knowledge_tags[0] : row.knowledge_tags;
  if (!nested) return null;
  return { category: nested.category, canonicalName: nested.canonical_name };
}

export async function searchSignals(filters: SignalSearchFilters): Promise<SignalListItem[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const [signals, companies] = await Promise.all([
    listSignalsForWorkspace(workspace.id),
    listCompaniesForWorkspace(workspace.id),
  ]);
  const companyById = new Map(companies.map((row) => [row.id, row]));
  const items: SignalListItem[] = [];
  for (const signal of signals) {
    const company = companyById.get(signal.company_id);
    const claims = await listSignalClaims(signal.id);
    items.push({
      id: signal.id,
      companyId: signal.company_id,
      companyName: company?.display_name ?? signal.company_id,
      companySlug: company?.slug ?? "",
      signalType: signal.signal_type,
      signalNature: signal.signal_nature,
      title: signal.title,
      summary: signal.summary,
      status: signal.status,
      importance: signal.importance,
      confidenceTier: signal.confidence_tier,
      assertionMode: signal.assertion_mode,
      eventDate: signal.event_date,
      geography: signal.geography,
      evidenceCount: claims.length,
      demoOrigin: isDemoOrigin(signal.metadata),
      createdAt: signal.created_at,
    });
  }
  return rankSignalSearch(items, filters);
}

export async function getSignalDetail(id: string): Promise<SignalDetail | null> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const signal = await getSignal(workspace.id, id);
  if (!signal) return null;
  const [companies, claimLinks, companyLinks, tagRows] = await Promise.all([
    listCompaniesForWorkspace(workspace.id),
    listSignalClaims(signal.id),
    listSignalCompanies(signal.id),
    listSignalTags(signal.id),
  ]);
  const companyById = new Map(companies.map((row) => [row.id, row]));
  const claims = await listClaimsByIds(claimLinks.map((row) => row.claim_id));
  const claimById = new Map(claims.map((row) => [row.id, row]));
  const evidenceRows = await listEvidenceQuotesForClaims(claimLinks.map((row) => row.claim_id));
  const validations = signal.origin_signal_candidate_id
    ? await listSignalValidations(signal.origin_signal_candidate_id)
    : [];
  const company = companyById.get(signal.company_id);
  return {
    id: signal.id,
    companyId: signal.company_id,
    companyName: company?.display_name ?? signal.company_id,
    companySlug: company?.slug ?? "",
    signalType: signal.signal_type,
    signalNature: signal.signal_nature,
    title: signal.title,
    summary: signal.summary,
    status: signal.status,
    importance: signal.importance,
    confidenceTier: signal.confidence_tier,
    assertionMode: signal.assertion_mode,
    eventDate: signal.event_date,
    effectivePeriodStart: signal.effective_period_start,
    effectivePeriodEnd: signal.effective_period_end,
    geography: signal.geography,
    sourceSnapshotId: signal.source_snapshot_id,
    originSignalCandidateId: signal.origin_signal_candidate_id,
    originModelRunId: signal.origin_model_run_id,
    parentSignalId: signal.parent_signal_id,
    supersedesSignalId: signal.supersedes_signal_id,
    createdAt: signal.created_at,
    updatedAt: signal.updated_at,
    demoOrigin: isDemoOrigin(signal.metadata),
    companies: companyLinks.map((row) => ({
      companyId: row.company_id,
      role: row.role,
      displayName: companyById.get(row.company_id)?.display_name ?? row.company_id,
    })),
    tags: tagRows.map(tagName).filter((tag): tag is { category: string; canonicalName: string } => Boolean(tag)),
    claims: claimLinks.map((row) => ({
      id: row.claim_id,
      statement: claimById.get(row.claim_id)?.statement ?? row.claim_id,
      assertionMode: claimById.get(row.claim_id)?.assertion_mode ?? "unspecified",
      relationshipType: row.relationship_type,
    })),
    evidence: evidenceRows.flatMap((row) => {
      const fragment = Array.isArray(row.evidence_fragments) ? row.evidence_fragments[0] : row.evidence_fragments;
      if (!fragment) return [];
      return [{ exactQuote: fragment.excerpt, snapshotId: fragment.source_snapshot_id }];
    }),
    validations: validations.map((row) => ({
      validatorCode: row.validator_code,
      validatorVersion: row.validator_version,
      validatorType: row.validator_type as "deterministic" | "model" | "hybrid",
      result: row.result as "pass" | "warn" | "fail",
      severity: row.severity as "info" | "review" | "blocking",
      message: row.message,
      details: row.details ?? {},
      modelRunId: row.model_run_id,
    })),
  };
}

export async function getSignalsForCompanySlug(slug: string): Promise<SignalListItem[]> {
  await requireAuthUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const companies = await listCompaniesForWorkspace(workspace.id);
  const company = companies.find((row) => row.slug === slug);
  if (!company) return [];
  return searchSignals({ companyId: company.id, status: "active" });
}
