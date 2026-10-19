"use server";

import { z } from "zod";
import { AccessDeniedError, assertEfesoAccess, assertEfesoAdmin, publicAccessErrorMessage } from "@/server/access/require-efeso-access";
import {
  cancelExternalResearch,
  previewCompanyQuery,
  resolveAmbiguousRun,
  startExternalCompanyResearch,
  tickExternalCompanyResearch,
} from "@/server/external-research/orchestrator";
import {
  countPromotedPipeline,
  getResearchRun,
  listResearchEvents,
  listResearchRuns,
  listResearchRunsForCompany,
  listSourceCandidates,
  listWorkspaceCompanies,
} from "@/server/external-research/persistence";
import { companySlugForRun } from "@/server/external-research/orchestrator";
import type { ExternalResearchRunRow, ExternalSourceCandidateRow } from "@/server/external-research/types";
import { t, ui } from "@/i18n";

const queryInput = z.object({
  query: z.string().trim().min(1).max(200),
  country: z.string().trim().max(80).optional(),
  industry: z.string().trim().max(120).optional(),
  existingSlug: z.string().trim().max(80).optional(),
  selectedDomain: z.string().trim().max(200).optional(),
  confirmUnresolved: z.boolean().optional(),
  instructions: z.string().trim().max(2000).optional(),
});

export type PreviewResearchResult =
  | { ok: true; kind: "existing"; slug: string; name: string; country: string; industry: string; domain: string }
  | { ok: true; kind: "resolved"; name: string; country: string; industry: string; domain: string }
  | { ok: true; kind: "ambiguous"; candidates: { name: string; country: string; industry: string; domain: string }[] }
  | { ok: true; kind: "unresolved"; suggestions: { name: string; country: string; industry: string; domain: string }[] }
  | { ok: false; error: string };

export async function previewExternalResearchAction(raw: unknown): Promise<PreviewResearchResult> {
  try {
    const access = await assertEfesoAccess();
    const parsed = queryInput.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Informe o nome de uma empresa." };
    const resolution = await previewCompanyQuery({
      workspaceId: access.workspaceId,
      query: parsed.data.query,
      country: parsed.data.country,
      industry: parsed.data.industry,
    });
    if (resolution.kind === "resolved") {
      const c = resolution.candidate;
      if (c.existingSlug) {
        return {
          ok: true,
          kind: "existing",
          slug: c.existingSlug,
          name: c.canonicalName,
          country: c.headquartersCountry,
          industry: c.industry,
          domain: c.officialDomain,
        };
      }
      return {
        ok: true,
        kind: "resolved",
        name: c.canonicalName,
        country: c.headquartersCountry,
        industry: c.industry,
        domain: c.officialDomain,
      };
    }
    const list = resolution.kind === "ambiguous" ? resolution.candidates : resolution.suggestions;
    const mapped = list.map((c) => ({
      name: c.canonicalName,
      country: c.headquartersCountry,
      industry: c.industry,
      domain: c.officialDomain,
    }));
    if (resolution.kind === "ambiguous") return { ok: true, kind: "ambiguous", candidates: mapped };
    return { ok: true, kind: "unresolved", suggestions: mapped };
  } catch (error) {
    return { ok: false, error: publicAccessErrorMessage(error) };
  }
}

export async function startExternalResearchAction(raw: unknown): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
  try {
    const access = await assertEfesoAccess();
    const parsed = queryInput.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Informe o nome de uma empresa." };
    let existingCompanyId: string | null = null;
    if (parsed.data.existingSlug) {
      const companies = await listWorkspaceCompanies(access.workspaceId);
      existingCompanyId = companies.find((row) => row.slug === parsed.data.existingSlug)?.id ?? null;
    }
    const run = await startExternalCompanyResearch({
      workspaceId: access.workspaceId,
      userId: access.userId,
      query: parsed.data.query,
      country: parsed.data.country,
      industry: parsed.data.industry,
      existingCompanyId,
      selectedDomain: parsed.data.selectedDomain ?? null,
      confirmUnresolved: parsed.data.confirmUnresolved === true,
      additionalInstructions: parsed.data.instructions ?? null,
    });
    return { ok: true, runId: run.id };
  } catch (error) {
    if (error instanceof AccessDeniedError) return { ok: false, error: publicAccessErrorMessage(error) };
    const message = error instanceof Error && error.message === "QUOTA_EXCEEDED"
      ? "O limite de pesquisas foi atingido. Tente novamente mais tarde."
      : "Não foi possível iniciar a pesquisa.";
    return { ok: false, error: message };
  }
}

export async function tickExternalResearchAction(runId: string): Promise<{ ok: true; run: ResearchView } | { ok: false; error: string }> {
  try {
    const access = await assertEfesoAccess();
    if (!z.string().uuid().safeParse(runId).success) return { ok: false, error: "Pesquisa inválida." };
    await tickExternalCompanyResearch(access.workspaceId, runId);
    return { ok: true, run: await loadView(access.workspaceId, runId) };
  } catch (error) {
    if (error instanceof AccessDeniedError) return { ok: false, error: publicAccessErrorMessage(error) };
    return { ok: false, error: "Não foi possível atualizar a pesquisa." };
  }
}

export async function getExternalResearchAction(runId: string): Promise<{ ok: true; run: ResearchView } | { ok: false; error: string }> {
  try {
    const access = await assertEfesoAccess();
    if (!z.string().uuid().safeParse(runId).success) return { ok: false, error: "Pesquisa inválida." };
    return { ok: true, run: await loadView(access.workspaceId, runId) };
  } catch (error) {
    if (error instanceof AccessDeniedError) return { ok: false, error: publicAccessErrorMessage(error) };
    return { ok: false, error: "Não foi possível carregar a pesquisa." };
  }
}

export async function resolveResearchEntityAction(raw: {
  runId: string;
  domain: string;
}): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
  try {
    const access = await assertEfesoAccess();
    const parsed = z.object({ runId: z.string().uuid(), domain: z.string().trim().min(1).max(200) }).safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Seleção inválida." };
    await resolveAmbiguousRun({
      workspaceId: access.workspaceId,
      runId: parsed.data.runId,
      officialDomain: parsed.data.domain,
      userId: access.userId,
    });
    return { ok: true, runId: parsed.data.runId };
  } catch (error) {
    if (error instanceof AccessDeniedError) return { ok: false, error: publicAccessErrorMessage(error) };
    return { ok: false, error: "Não foi possível confirmar a empresa." };
  }
}

export async function cancelExternalResearchAction(runId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const access = await assertEfesoAccess();
    if (!z.string().uuid().safeParse(runId).success) return { ok: false, error: "Pesquisa inválida." };
    await cancelExternalResearch(access.workspaceId, runId, access.userId);
    return { ok: true };
  } catch (error) {
    if (error instanceof AccessDeniedError) return { ok: false, error: publicAccessErrorMessage(error) };
    return { ok: false, error: "Não foi possível cancelar a pesquisa." };
  }
}

export type ResearchView = {
  id: string;
  status: ExternalResearchRunRow["status"];
  query: string;
  failureReason: string | null;
  failureCode: string | null;
  sourceCount: number;
  acceptedCount: number;
  rejectedCount: number;
  unavailableCount: number;
  companySlug: string | null;
  analysisId: string | null;
  counts: { claims: number; signals: number; opportunities: number; pendingFacts?: number; intelligence?: number } | null;
  memberProgress: string | null;
  initialAnalysisAvailable: boolean;
  enrichmentInProgress: boolean;
  candidates: { name: string; country: string; industry: string; domain: string }[];
  sources: Array<{
    id: string;
    title: string | null;
    publisher: string;
    url: string;
    publishedAt: string | null;
    sourceType: string;
    quality: string;
    status: string;
    rejectionReason: string | null;
  }>;
};

async function loadView(workspaceId: string, runId: string): Promise<ResearchView> {
  const run = await getResearchRun(workspaceId, runId);
  if (!run) throw new Error("RUN_NOT_FOUND");
  const sources = await listSourceCandidates(run.id);
  const slug = await companySlugForRun(run);
  const payloadCandidates = Array.isArray(run.resolution_payload.candidates)
    ? (run.resolution_payload.candidates as Array<Record<string, unknown>>)
    : [];
  const payloadCounts =
    run.resolution_payload.counts && typeof run.resolution_payload.counts === "object"
      ? (run.resolution_payload.counts as { claims: number; signals: number; opportunities: number; pendingFacts?: number; intelligence?: number })
      : null;
  const counts =
    run.resolved_company_id && run.analysis_id
      ? await countPromotedPipeline(workspaceId, run.resolved_company_id, run.analysis_id)
      : payloadCounts;
  const terminal = ["completed", "partial", "failed", "cancelled"].includes(run.status);
  const claimCount = counts?.claims ?? 0;
  const signalCount = counts?.signals ?? 0;
  const intelligenceCount = counts?.intelligence ?? 0;
  const initialAnalysisAvailable = signalCount > 0 || intelligenceCount > 0;
  const enrichmentInProgress = !terminal && (claimCount > 0 || initialAnalysisAvailable);
  let memberProgress: string | null = null;
  if (!terminal && run.status !== "needs_user_resolution") {
    if (signalCount > 0) memberProgress = ui.externalResearch.firstMovementsEnriching;
    else if (claimCount >= 2) {
      memberProgress = `${t(ui.externalResearch.factsValidated, { count: claimCount })} ${ui.externalResearch.firstIntelligencePreparing}`;
    }
  }
  return {
    id: run.id,
    status: run.status,
    query: run.requested_query,
    failureReason: run.failure_reason,
    failureCode: run.failure_code,
    sourceCount: run.source_count,
    acceptedCount: run.accepted_source_count,
    rejectedCount: run.rejected_source_count,
    unavailableCount: run.unavailable_source_count,
    companySlug: slug,
    analysisId: run.analysis_id,
    counts,
    memberProgress,
    initialAnalysisAvailable,
    enrichmentInProgress,
    candidates: payloadCandidates.map((row) => ({
      name: String(row.canonicalName ?? row.name ?? ""),
      country: String(row.headquartersCountry ?? row.country ?? ""),
      industry: String(row.industry ?? ""),
      domain: String(row.officialDomain ?? row.domain ?? ""),
    })),
    sources: sources.map((row: ExternalSourceCandidateRow) => ({
      id: row.id,
      title: row.title,
      publisher: row.publisher,
      url: row.url,
      publishedAt: row.published_at,
      sourceType: row.source_type,
      quality: row.source_quality,
      status: row.status,
      rejectionReason: row.rejection_reason,
    })),
  };
}

export async function listCompanyResearchHistoryAction(slug: string) {
  const access = await assertEfesoAccess();
  const companies = await listWorkspaceCompanies(access.workspaceId);
  const company = companies.find((row) => row.slug === slug);
  if (!company) return [];
  return listResearchRunsForCompany(access.workspaceId, company.id);
}

export async function adminListResearchRunsAction() {
  const access = await assertEfesoAdmin();
  const runs = await listResearchRuns(access.workspaceId, 80);
  const eventsByRun: Record<string, Awaited<ReturnType<typeof listResearchEvents>>> = {};
  const sourcesByRun: Record<string, ExternalSourceCandidateRow[]> = {};
  for (const run of runs.slice(0, 20)) {
    eventsByRun[run.id] = await listResearchEvents(run.id);
    sourcesByRun[run.id] = await listSourceCandidates(run.id);
  }
  return { runs, eventsByRun, sourcesByRun };
}
