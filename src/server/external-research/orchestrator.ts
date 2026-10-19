import "server-only";
import { isIntelligenceGenerationConfigured, getLanguageModelProviderName } from "@/server/ai/config";
import { getLanguageModelProvider } from "@/server/ai/get-provider";
import {
  ModelIncompleteResponseError,
  ModelProviderUnavailableError,
  ModelRefusalError,
} from "@/server/ai/errors";
import { executeControlledExtraction } from "@/server/services/controlled-intelligence-extraction-service";
import { executeSignalExtraction } from "@/server/services/signal-extraction-service";
import { runAccountIntelligenceForCompany } from "@/server/services/account-intelligence-service";
import { runEfesoFitForCompany } from "@/server/services/efeso-fit-service";
import { runOpportunitiesForCompany } from "@/server/services/opportunity-extraction-service";
import { runRecommendedActionsForCompany } from "@/server/services/recommended-action-extraction-service";
import { slugify } from "@/lib/routes";
import { failStaleRunningModelRuns, listBlocksForSnapshot, listCandidatesForAnalysis, listCandidatesForSnapshot } from "@/server/extraction/pipeline-persistence";
import { sha256Json } from "@/server/extraction/sha256";
import { listClaimsForSignalExtraction, listEvidenceQuotesForClaims, listSignalCandidatesForAnalysis } from "@/server/signals/persistence";
import { getExternalResearchLimits } from "./config";
import { detectPotentialClaimConflicts } from "./conflicts";
import { discoverCompanySources, selectAcceptedSources, selectInitialSources } from "./discover";
import { resolveCompanyEntity, type ExistingCompanyRecord } from "./entity";
import { UnsafeFetchError } from "./fetch-safe";
import {
  attachSnapshotToLegacyRun,
  findReusableSnapshot,
  getSnapshotNormalizedText,
  ingestFetchedDocument,
  isLowYieldNormalizedText,
} from "./ingest";
import { urlSubstanceScore } from "./priority";
import { normalizeCompanyQuery } from "./normalize";
import {
  completeLegacyResearchRun,
  countConcurrentRuns,
  countPromotedPipeline,
  countUserRunsSince,
  getCompanySlug,
  getResearchRun,
  insertAnalysis,
  insertCompany,
  insertCompanyAlias,
  insertLegacyResearchRun,
  insertResearchEvent,
  insertResearchRun,
  insertSourceCandidates,
  isTerminalStatus,
  listActiveMetricClaims,
  listCompanyAliases,
  listSourceCandidates,
  listWorkspaceCompanies,
  markAnalysisReady,
  markClaimsPotentialConflict,
  transitionRun,
  updateCompanyLastResearched,
  updateResearchRun,
  updateSourceCandidate,
} from "./persistence";
import { sanitizePublicResearchQuery } from "./privacy";
import { promoteViaPipelineAdmin } from "./promote";
import { createMemberExternalResearchProvider } from "./provider";
import { TavilyProviderError } from "./tavily-errors";
import type { EntityCandidate, ExternalResearchRunRow, ExternalSourceCandidateRow, ResearchFailureCode } from "./types";

const OPENAI_PARTIAL_MESSAGE =
  "Pesquisa de fontes concluída. A geração de inteligência está indisponível porque OpenAI não está configurada neste ambiente.";
const LOCAL_MODEL_MESSAGE = "O mecanismo local de análise não está disponível.";
const TAVILY_UNAVAILABLE_MESSAGE = "Não foi possível concluir a busca de fontes neste momento.";

export async function startExternalCompanyResearch(input: {
  workspaceId: string;
  userId: string;
  query: string;
  country?: string | null;
  industry?: string | null;
  existingCompanyId?: string | null;
  selectedDomain?: string | null;
  timeHorizonMonths?: number;
}): Promise<ExternalResearchRunRow> {
  const limits = getExternalResearchLimits();
  const concurrent = await countConcurrentRuns(input.workspaceId);
  if (concurrent >= limits.maxConcurrentRuns) {
    throw Object.assign(new Error("QUOTA_EXCEEDED"), { code: "QUOTA_EXCEEDED" as const });
  }
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await countUserRunsSince(input.workspaceId, input.userId, hourAgo);
  if (recent >= limits.maxRunsPerUserPerHour) {
    throw Object.assign(new Error("QUOTA_EXCEEDED"), { code: "QUOTA_EXCEEDED" as const });
  }

  const query = sanitizePublicResearchQuery(input.query);
  if (!query) throw new Error("INVALID_QUERY");
  const horizon = input.timeHorizonMonths ?? limits.defaultHorizonMonths;
  const run = await insertResearchRun({
    workspaceId: input.workspaceId,
    query,
    normalizedQuery: normalizeCompanyQuery(query),
    country: input.country ?? null,
    industry: input.industry ?? null,
    horizon,
    createdBy: input.userId,
  });
  const payload: Record<string, unknown> = {};
  if (input.existingCompanyId) payload.existingCompanyId = input.existingCompanyId;
  if (input.selectedDomain) payload.selectedDomain = input.selectedDomain;
  if (Object.keys(payload).length > 0) {
    await updateResearchRun(input.workspaceId, run.id, { resolution_payload: payload });
  }
  await insertResearchEvent({
    workspaceId: input.workspaceId,
    researchRunId: run.id,
    eventType: "run_created",
    actorUserId: input.userId,
    payload: { query },
  });
  return { ...run, resolution_payload: { ...run.resolution_payload, ...payload } };
}

export async function previewCompanyQuery(input: {
  workspaceId: string;
  query: string;
  country?: string | null;
  industry?: string | null;
}) {
  const query = sanitizePublicResearchQuery(input.query);
  const existing = await loadExisting(input.workspaceId);
  return resolveCompanyEntity({
    query,
    country: input.country,
    industry: input.industry,
    existing,
  });
}

export async function tickExternalCompanyResearch(workspaceId: string, runId: string): Promise<ExternalResearchRunRow> {
  const loaded = await getResearchRun(workspaceId, runId);
  if (!loaded) throw new Error("RUN_NOT_FOUND");
  if (isTerminalStatus(loaded.status) && loaded.status !== "needs_user_resolution") return loaded;
  if (loaded.status === "needs_user_resolution") return loaded;
  const run = await persistHeartbeat(loaded);

  try {
    switch (run.status) {
      case "queued":
        return (await transitionRun(workspaceId, runId, "queued", { status: "resolving_entity" })) ?? run;
      case "resolving_entity":
        return await phaseResolveEntity(run);
      case "discovering_sources":
        return await phaseDiscover(run);
      case "reviewing_sources":
        return await phaseReview(run);
      case "ingesting_sources":
        return await phaseIngest(run);
      case "extracting_claims":
        return await phaseClaims(run);
      case "generating_signals":
        return await phaseSignals(run);
      case "generating_intelligence":
        return await phaseIntelligence(run);
      case "generating_opportunities":
        return await phaseOpportunities(run);
      case "generating_actions":
        return await phaseActions(run);
      default:
        return run;
    }
  } catch (error) {
    const code = failureCode(error);
    const detail = errorDetail(error);
    // Transient local-model failures after claims exist must not erase a recoverable run.
    if (isRecoverableModelError(error) && run.resolved_company_id && run.analysis_id) {
      const claims = await listActiveMetricClaims(workspaceId, run.resolved_company_id);
      if (claims.length > 0) {
        await insertResearchEvent({
          workspaceId,
          researchRunId: runId,
          eventType: "pipeline_note",
          payload: {
            code: "MODEL_PROVIDER_TRANSIENT",
            failureCode: code,
            detail: detail.slice(0, 240),
          },
        });
        await finishPartial(run, code === "LOCAL_MODEL_UNAVAILABLE" ? "LOCAL_MODEL_UNAVAILABLE" : "OPENAI_FAILED", publicFailureMessage(code), run.unavailable_source_count);
        return (await getResearchRun(workspaceId, runId)) ?? run;
      }
    }
    // PostgREST/RPC plain objects during late phases must not discard an otherwise complete research run.
    if (run.resolved_company_id && run.analysis_id && isInfrastructureObjectError(error)) {
      const claims = await listClaimsForSignalExtraction({
        workspaceId,
        companyId: run.resolved_company_id,
        analysisId: run.analysis_id,
      });
      if (claims.length > 0) {
        await insertResearchEvent({
          workspaceId,
          researchRunId: runId,
          eventType: "pipeline_note",
          payload: { code: "LATE_PHASE_INFRA_ERROR", detail: detail.slice(0, 240) },
        });
        await finishPartial(run, "OPENAI_FAILED", "Pesquisa concluída com limitações no enriquecimento final.", run.unavailable_source_count);
        // Prefer a soft partial without a hard-fail code so promoted signals remain visible.
        await updateResearchRun(workspaceId, runId, {
          failure_code: null,
          failure_reason: "Pesquisa concluída com limitações no enriquecimento final.",
        });
        return (await getResearchRun(workspaceId, runId)) ?? run;
      }
    }
    const message = publicFailureMessage(code);
    const updated = await updateResearchRun(workspaceId, runId, {
      status: "failed",
      failure_code: code,
      failure_reason: message,
      completed_at: new Date().toISOString(),
    });
    await insertResearchEvent({
      workspaceId,
      researchRunId: runId,
      eventType: "run_failed",
      payload: {
        code,
        detail: detail.slice(0, 240),
      },
    });
    if (run.research_run_id) await completeLegacyResearchRun(workspaceId, run.research_run_id, true);
    return updated;
  }
}

export async function resolveAmbiguousRun(input: {
  workspaceId: string;
  runId: string;
  officialDomain: string;
  userId: string;
}): Promise<ExternalResearchRunRow> {
  const run = await getResearchRun(input.workspaceId, input.runId);
  if (!run || run.status !== "needs_user_resolution") throw new Error("RUN_NOT_FOUND");
  const updated = await transitionRun(input.workspaceId, input.runId, "needs_user_resolution", {
    status: "resolving_entity",
    resolution_payload: { ...run.resolution_payload, selectedDomain: input.officialDomain },
    failure_code: null,
    failure_reason: null,
  });
  if (!updated) throw new Error("RUN_NOT_FOUND");
  await insertResearchEvent({
    workspaceId: input.workspaceId,
    researchRunId: input.runId,
    eventType: "user_initiated",
    actorUserId: input.userId,
    payload: { selectedDomain: input.officialDomain },
  });
  return updated;
}

export async function cancelExternalResearch(workspaceId: string, runId: string, userId: string): Promise<ExternalResearchRunRow> {
  const run = await getResearchRun(workspaceId, runId);
  if (!run) throw new Error("RUN_NOT_FOUND");
  if (isTerminalStatus(run.status) && run.status !== "needs_user_resolution") return run;
  const updated = await updateResearchRun(workspaceId, runId, {
    status: "cancelled",
    failure_code: "CANCELLED",
    failure_reason: "Pesquisa cancelada.",
    completed_at: new Date().toISOString(),
  });
  await insertResearchEvent({
    workspaceId,
    researchRunId: runId,
    eventType: "run_cancelled",
    actorUserId: userId,
  });
  if (run.research_run_id) await completeLegacyResearchRun(workspaceId, run.research_run_id, true);
  return updated;
}

export async function resumeExternalResearch(workspaceId: string, runId: string, userId: string): Promise<ExternalResearchRunRow> {
  const run = await getResearchRun(workspaceId, runId);
  if (!run) throw new Error("RUN_NOT_FOUND");
  if (!isTerminalStatus(run.status) || run.status === "needs_user_resolution") return run;
  if (run.status === "completed") {
    // Allow resume when signal validation was interrupted after the run was marked complete.
    if (!run.analysis_id) return run;
    const pendingSignals = (await listSignalCandidatesForAnalysis(run.analysis_id)).some(
      (row) => row.status === "pending_validation",
    );
    if (!pendingSignals) return run;
  }
  if (!run.analysis_id || !run.resolved_company_id) throw new Error("RUN_NOT_RESUMABLE");
  await failStaleRunningModelRuns(run.analysis_id);
  const nextStatus = await inferResumeStatus(run);
  const updated = await updateResearchRun(workspaceId, runId, {
    status: nextStatus,
    failure_code: null,
    failure_reason: null,
    completed_at: null,
    resolution_payload: {
      ...run.resolution_payload,
      resumed_from: run.status,
      resumed_at: new Date().toISOString(),
    },
  });
  await insertResearchEvent({
    workspaceId,
    researchRunId: runId,
    eventType: "run_resumed",
    actorUserId: userId,
    payload: { from: run.status, to: nextStatus },
  });
  return updated;
}

async function inferResumeStatus(run: ExternalResearchRunRow): Promise<ExternalResearchRunRow["status"]> {
  if (!run.analysis_id) return "extracting_claims";
  const candidates = await listCandidatesForAnalysis(run.analysis_id);
  if (candidates.some((row) => row.status === "pending_validation")) return "extracting_claims";
  const signalCandidates = await listSignalCandidatesForAnalysis(run.analysis_id);
  if (
    signalCandidates.some(
      (row) =>
        row.status === "pending_validation" ||
        (row.status === "needs_review" &&
          (row.rejection_reason_code === "geography" ||
            row.rejection_reason_code === "period" ||
            row.rejection_reason_code === "magnitude")),
    )
  ) {
    return "generating_signals";
  }
  return "generating_signals";
}

async function phaseResolveEntity(run: ExternalResearchRunRow): Promise<ExternalResearchRunRow> {
  const existing = await loadExisting(run.workspace_id);
  const selectedDomain = typeof run.resolution_payload.selectedDomain === "string" ? run.resolution_payload.selectedDomain : null;
  const existingCompanyId =
    typeof run.resolution_payload.existingCompanyId === "string" ? run.resolution_payload.existingCompanyId : null;
  let resolution = resolveCompanyEntity({
    query: run.requested_query,
    country: run.requested_country,
    industry: run.requested_industry,
    existing,
  });
  if (selectedDomain && resolution.kind !== "resolved") {
    const pool = resolution.kind === "ambiguous" ? resolution.candidates : resolution.suggestions;
    const picked = pool.find((item) => item.officialDomain === selectedDomain);
    if (picked) resolution = { kind: "resolved", candidate: picked };
  }
  if (existingCompanyId) {
    const match = existing.find((row) => row.id === existingCompanyId);
    if (match) {
      resolution = {
        kind: "resolved",
        candidate: {
          canonicalName: match.displayName,
          officialDomain: (match.domain ?? "").replace(/^www\./, ""),
          headquartersCountry: match.country ?? "",
          industry: match.industry ?? "",
          aliases: match.aliases,
          decisionBasis: ["existing workspace record"],
          existingCompanyId: match.id,
          existingSlug: match.slug,
        },
      };
    }
  }

  if (resolution.kind !== "resolved") {
    const candidates = resolution.kind === "ambiguous" ? resolution.candidates : resolution.suggestions;
    return (await transitionRun(run.workspace_id, run.id, "resolving_entity", {
      status: "needs_user_resolution",
      failure_code: "ENTITY_AMBIGUOUS",
      failure_reason: "Há mais de uma empresa possível. Escolha a identidade correta.",
      resolution_payload: {
        ...run.resolution_payload,
        kind: resolution.kind,
        candidates: candidates.map(serializeCandidate),
      },
    })) ?? run;
  }

  const company = await ensureCompany(run.workspace_id, resolution.candidate);
  const analysis = await insertAnalysis({
    workspaceId: run.workspace_id,
    companyId: company.id,
    userId: run.created_by ?? "",
    title: resolution.candidate.canonicalName,
    country: resolution.candidate.headquartersCountry,
  });
  const legacy = await insertLegacyResearchRun({
    workspaceId: run.workspace_id,
    analysisId: analysis.id,
    userId: run.created_by ?? "",
    runType: existingCompanyId ? "revalidation" : "initial",
  });
  await insertResearchEvent({
    workspaceId: run.workspace_id,
    researchRunId: run.id,
    eventType: "company_resolved",
    actorUserId: run.created_by,
    payload: { companyId: company.id, domain: resolution.candidate.officialDomain },
  });
  return (
    (await transitionRun(run.workspace_id, run.id, "resolving_entity", {
      status: "discovering_sources",
      resolved_company_id: company.id,
      analysis_id: analysis.id,
      research_run_id: legacy.id,
      resolution_payload: { ...run.resolution_payload, candidate: serializeCandidate(resolution.candidate) },
    })) ?? run
  );
}

async function phaseDiscover(run: ExternalResearchRunRow): Promise<ExternalResearchRunRow> {
  const candidate = candidateFromPayload(run);
  const provider = createMemberExternalResearchProvider(candidate?.officialDomain ?? null);
  if (!provider) {
    return fail(run, "PROVIDER_NOT_CONFIGURED", "Nenhum provedor de pesquisa externa está configurado neste ambiente.");
  }
  const { assessed } = await discoverCompanySources({
    companyName: candidate?.canonicalName ?? run.requested_query,
    officialDomain: candidate?.officialDomain ?? null,
    country: run.requested_country ?? candidate?.headquartersCountry ?? null,
    provider,
    horizonMonths: run.time_horizon_months,
  });
  const qualityAccepted = selectAcceptedSources(assessed);
  const initial = selectInitialSources(assessed, candidate?.officialDomain ?? null);
  const initialUrls = new Set(initial.map((row) => row.normalizedUrl));
  await insertSourceCandidates(
    assessed.map((row) => ({
      workspaceId: run.workspace_id,
      researchRunId: run.id,
      url: row.url,
      normalizedUrl: row.normalizedUrl,
      title: row.title,
      publisher: row.publisher,
      sourceType: row.sourceType,
      sourceTier: row.sourceTier,
      sourceQuality: row.sourceQuality,
      publishedAt: row.publishedAt,
      status: !row.accepted ? "rejected" : initialUrls.has(row.normalizedUrl) ? "accepted" : "discovered",
      rejectionReason: row.rejectionReason,
      canonicalUrl: row.canonicalUrl ?? null,
    })),
  );
  const accepted = initial;
  const rejected = assessed.length - qualityAccepted.length;
  for (const row of assessed) {
    await insertResearchEvent({
      workspaceId: run.workspace_id,
      researchRunId: run.id,
      eventType: row.accepted ? "source_accepted" : "source_rejected",
      payload: {
        url: row.url,
        reason: row.rejectionReason,
        quality: row.sourceQuality,
        initial: initialUrls.has(row.normalizedUrl),
      },
    });
  }
  return (
    (await transitionRun(run.workspace_id, run.id, "discovering_sources", {
      status: "reviewing_sources",
      source_count: assessed.length,
      accepted_source_count: accepted.length,
      rejected_source_count: rejected,
    })) ?? run
  );
}

async function phaseReview(run: ExternalResearchRunRow): Promise<ExternalResearchRunRow> {
  if (run.accepted_source_count < 1) {
    return fail(run, "NO_RELIABLE_SOURCES", "Não encontramos fontes públicas suficientemente confiáveis.");
  }
  return (await transitionRun(run.workspace_id, run.id, "reviewing_sources", { status: "ingesting_sources" })) ?? run;
}

async function phaseIngest(run: ExternalResearchRunRow): Promise<ExternalResearchRunRow> {
  if (!run.research_run_id) throw new Error("RESEARCH_RUN_NOT_FOUND");
  const candidate = candidateFromPayload(run);
  const provider = createMemberExternalResearchProvider(candidate?.officialDomain ?? null);
  if (!provider) return fail(run, "PROVIDER_NOT_CONFIGURED", "Nenhum provedor de pesquisa externa está configurado neste ambiente.");
  const limits = getExternalResearchLimits();
  let unavailable = 0;
  let totalBytes = 0;

  const ingestRow = async (row: ExternalSourceCandidateRow) => {
    if (row.snapshot_id || !run.research_run_id) return;
    const canonical = row.canonical_url || row.url;
    const reused = await findReusableSnapshot(run.workspace_id, canonical);
    if (reused) {
      await attachSnapshotToLegacyRun({
        workspaceId: run.workspace_id,
        legacyResearchRunId: run.research_run_id,
        sourceId: reused.sourceId,
      });
      await updateSourceCandidate(row.id, {
        status: "fetched",
        source_id: reused.sourceId,
        snapshot_id: reused.snapshotId,
        content_hash: null,
      });
      return;
    }
    try {
      const document = await provider.fetchDocument(row.url);
      totalBytes += document.bytes.byteLength;
      const ingested = await ingestFetchedDocument({
        workspaceId: run.workspace_id,
        researchRunId: run.id,
        legacyResearchRunId: run.research_run_id,
        candidate: row,
        document,
        totalBytesUsed: totalBytes - document.bytes.byteLength,
      });
      await updateSourceCandidate(row.id, {
        status: "fetched",
        source_id: ingested.sourceId,
        snapshot_id: ingested.snapshotId,
        content_hash: null,
      });
    } catch (error) {
      const status = fetchStatus(error);
      await updateSourceCandidate(row.id, { status, rejection_reason: status === "unavailable" ? "unavailable" : "fetch_failed" });
      if (status === "unavailable") unavailable += 1;
    }
  };

  const rows = await listSourceCandidates(run.id);
  for (const row of rows.filter((item) => item.status === "accepted" && !item.snapshot_id)) {
    await ingestRow(row);
  }

  const markThinFetched = async () => {
    const fetched = (await listSourceCandidates(run.id)).filter((row) => row.snapshot_id && row.status !== "rejected");
    for (const row of fetched) {
      const text = await getSnapshotNormalizedText(row.snapshot_id as string);
      if (isLowYieldNormalizedText(text)) {
        await updateSourceCandidate(row.id, { status: "rejected", rejection_reason: "thin_content" });
      }
    }
  };
  await markThinFetched();

  let substantial = (await listSourceCandidates(run.id)).filter((row) => row.snapshot_id && row.status !== "rejected");
  if (substantial.length < limits.initialAcceptedSourceLimit) {
    const deferred = (await listSourceCandidates(run.id))
      .filter((row) => row.status === "discovered")
      .sort(
        (left, right) =>
          urlSubstanceScore(right.canonical_url || right.url, right.title) -
          urlSubstanceScore(left.canonical_url || left.url, left.title),
      );
    let attempts = 0;
    for (const row of deferred) {
      if (substantial.length >= limits.initialAcceptedSourceLimit) break;
      if (attempts >= limits.enrichmentSourceLimit) break;
      attempts += 1;
      await updateSourceCandidate(row.id, { status: "accepted" });
      await ingestRow({ ...row, status: "accepted" });
      await markThinFetched();
      substantial = (await listSourceCandidates(run.id)).filter((item) => item.snapshot_id && item.status !== "rejected");
    }
  }

  let snapshots = (await listSourceCandidates(run.id)).filter((row) => row.snapshot_id && row.status !== "rejected");
  if (snapshots.length === 0) {
    const deferred = (await listSourceCandidates(run.id))
      .filter((row) => row.status === "discovered")
      .slice(0, limits.initialAcceptedSourceLimit);
    for (const row of deferred) {
      await updateSourceCandidate(row.id, { status: "accepted" });
      await ingestRow({ ...row, status: "accepted" });
    }
    snapshots = (await listSourceCandidates(run.id)).filter((row) => row.snapshot_id);
  }
  if (snapshots.length === 0) {
    return fail(run, "SOURCE_FETCH_FAILED", "Não foi possível acessar as fontes encontradas.");
  }
  if (!isIntelligenceGenerationConfigured()) {
    const code = getLanguageModelProviderName() === "ollama" ? "LOCAL_MODEL_UNAVAILABLE" : "OPENAI_NOT_CONFIGURED";
    await finishPartial(run, code, code === "LOCAL_MODEL_UNAVAILABLE" ? LOCAL_MODEL_MESSAGE : OPENAI_PARTIAL_MESSAGE, unavailable);
    return (await getResearchRun(run.workspace_id, run.id)) ?? run;
  }
  return (
    (await transitionRun(run.workspace_id, run.id, "ingesting_sources", {
      status: "extracting_claims",
      unavailable_source_count: unavailable,
    })) ?? run
  );
}

async function phaseClaims(run: ExternalResearchRunRow): Promise<ExternalResearchRunRow> {
  if (!run.analysis_id || !run.research_run_id || !run.resolved_company_id) throw new Error("PIPELINE_VALIDATION_FAILED");
  if (!isIntelligenceGenerationConfigured()) {
    const code = getLanguageModelProviderName() === "ollama" ? "LOCAL_MODEL_UNAVAILABLE" : "OPENAI_NOT_CONFIGURED";
    await finishPartial(run, code, code === "LOCAL_MODEL_UNAVAILABLE" ? LOCAL_MODEL_MESSAGE : OPENAI_PARTIAL_MESSAGE, run.unavailable_source_count);
    return (await getResearchRun(run.workspace_id, run.id)) ?? run;
  }
  await failStaleRunningModelRuns(run.analysis_id);
  const provider = getLanguageModelProvider();
  const limits = getExternalResearchLimits();
  // Local models still extract from every initially accepted/fetched snapshot — capping at 1
  // left high-value operational sources unused after discovery already paid for them.
  const extractLimit = limits.initialAcceptedSourceLimit;
  const companies = await listWorkspaceCompanies(run.workspace_id);
  const companyName = companies.find((row) => row.id === run.resolved_company_id)?.display_name ?? run.requested_query;
  const rows = (await listSourceCandidates(run.id))
    .filter((row) => row.snapshot_id && row.source_id && (row.status === "fetched" || row.status === "accepted"))
    .sort(
      (left, right) =>
        urlSubstanceScore(right.canonical_url || right.url, right.title) -
        urlSubstanceScore(left.canonical_url || left.url, left.title),
    );
  let extracted = 0;
  let extractionFailures = 0;
  let extractionSucceeded = false;
  const extractionArgs = (row: ExternalSourceCandidateRow, blocks: Awaited<ReturnType<typeof listBlocksForSnapshot>>) => ({
    workspaceId: run.workspace_id,
    analysisId: run.analysis_id as string,
    researchRunId: run.research_run_id as string,
    companyId: run.resolved_company_id as string,
    sourceSnapshotId: row.snapshot_id as string,
    sourceId: row.source_id as string,
    reusedSnapshot: false,
    parserName: blocks[0]?.parser_name ?? "plain-text",
    parserVersion: blocks[0]?.parser_version ?? "1",
    companyName,
    blocks: blocks.map((block) => ({
      blockIndex: block.block_index,
      blockType: block.block_type as never,
      textContent: block.text_content,
      pageNumber: block.page_number,
      sectionTitle: block.section_title,
      locator: (block.locator ?? {}) as Record<string, unknown>,
      parseConfidence: block.parse_confidence,
      metadata: (block.metadata ?? {}) as Record<string, unknown>,
    })),
    provider,
    promote: (id: string) => promoteViaPipelineAdmin("promote_claim_candidate", id),
    onAfterDecision: async () => {
      await maybeGenerateFirstUsefulIntelligence(run);
    },
    onBatchReport: async (report: { called: boolean; zodOk: boolean; fallbackReason: string | null; batchMs: number | null; fallbackCount: number; fallbackMs: number[]; candidateCount: number }) => {
      await insertResearchEvent({
        workspaceId: run.workspace_id,
        researchRunId: run.id,
        eventType: "semantic_batch",
        payload: report,
      });
      const latest = (await getResearchRun(run.workspace_id, run.id)) ?? run;
      await updateResearchRun(run.workspace_id, run.id, {
        resolution_payload: { ...latest.resolution_payload, semantic_batch: report },
      });
    },
  });
  for (const row of rows) {
    const snapshotText = await getSnapshotNormalizedText(row.snapshot_id as string);
    if (isLowYieldNormalizedText(snapshotText)) continue;
    const existing = (await listCandidatesForSnapshot(row.snapshot_id as string)).filter(
      (candidate) => candidate.analysis_id === run.analysis_id,
    );
    const pending = existing.filter((candidate) => candidate.status === "pending_validation");
    if (existing.length > 0 && pending.length === 0) continue;
    if (existing.length === 0) {
      if (extracted >= extractLimit) continue;
      extracted += 1;
    }
    const blocks = await listBlocksForSnapshot(row.snapshot_id as string);
    if (blocks.length === 0) continue;
    try {
      await executeControlledExtraction(extractionArgs(row, blocks));
      extractionSucceeded = true;
      await persistPartialCounts(run);
      const promotedClaims = await listClaimsForSignalExtraction({
        workspaceId: run.workspace_id,
        companyId: run.resolved_company_id,
        analysisId: run.analysis_id,
      });
      if (promotedClaims.length === 0) {
        // Hollow/nav pages can "succeed" with zero promoted claims — keep trying richer snapshots.
        continue;
      }
      await maybeGenerateFirstUsefulIntelligence(run);
      break;
    } catch (error) {
      extractionFailures += 1;
      await insertResearchEvent({
        workspaceId: run.workspace_id,
        researchRunId: run.id,
        eventType: "source_rejected",
        payload: {
          url: row.url,
          reason: "extraction_failed",
          detail: error instanceof Error ? error.message.slice(0, 240) : "unknown",
        },
      });
      // Do not abandon remaining fetched sources after a model/provider failure on one snapshot.
      continue;
    }
  }
  const claims = await listActiveMetricClaims(run.workspace_id, run.resolved_company_id);
  const conflicts = detectPotentialClaimConflicts(
    claims.map((claim) => ({
      id: claim.id,
      metricName: claim.metric_name,
      numericValue: claim.numeric_value,
      periodStart: claim.period_start,
      periodEnd: claim.period_end,
      asOfDate: claim.as_of_date,
    })),
  );
  if (conflicts.length > 0) {
    await markClaimsPotentialConflict([...new Set(conflicts.flatMap((item) => [item.leftId, item.rightId]))]);
  }
  await persistPartialCounts(run);
  const remaining = (await listCandidatesForAnalysis(run.analysis_id)).filter((row) => row.status === "pending_validation");
  if (remaining.length > 0) {
    return (await getResearchRun(run.workspace_id, run.id)) ?? run;
  }
  if (!extractionSucceeded && extractionFailures > 0) {
    await finishPartial(
      run,
      getLanguageModelProviderName() === "ollama" ? "LOCAL_MODEL_UNAVAILABLE" : "OPENAI_FAILED",
      getLanguageModelProviderName() === "ollama" ? LOCAL_MODEL_MESSAGE : OPENAI_PARTIAL_MESSAGE,
      run.unavailable_source_count,
    );
    return (await getResearchRun(run.workspace_id, run.id)) ?? run;
  }
  return (await transitionRun(run.workspace_id, run.id, "extracting_claims", { status: "generating_signals" })) ?? run;
}

async function phaseSignals(run: ExternalResearchRunRow): Promise<ExternalResearchRunRow> {
  if (!run.analysis_id || !run.research_run_id || !run.resolved_company_id) throw new Error("PIPELINE_VALIDATION_FAILED");
  await maybeGenerateFirstUsefulIntelligence(run);
  const latest = (await getResearchRun(run.workspace_id, run.id)) ?? run;
  const gate = await progressiveGate(latest);
  const existingSignals = await listSignalCandidatesForAnalysis(latest.analysis_id as string);
  const pendingSignals = existingSignals.filter((row) => row.status === "pending_validation");
  const optionalAbsenceReview = existingSignals.some(
    (row) =>
      row.status === "needs_review" &&
      (row.rejection_reason_code === "geography" ||
        row.rejection_reason_code === "period" ||
        row.rejection_reason_code === "magnitude"),
  );
  const previousHash = typeof latest.resolution_payload.signals_claim_hash === "string" ? latest.resolution_payload.signals_claim_hash : null;
  const claimSetUnchanged = previousHash === gate.claimHash;
  // Resume interrupted validation without forcing a fresh model extraction when claims did not change.
  const pendingOnly =
    claimSetUnchanged &&
    existingSignals.length > 0 &&
    (pendingSignals.length > 0 || optionalAbsenceReview);
  // Re-run when claim set changed, no candidates yet, or validation was interrupted mid-flight.
  if (existingSignals.length === 0 || !claimSetUnchanged || pendingSignals.length > 0 || optionalAbsenceReview) {
    try {
      const summary = await executeSignalExtraction({
        workspaceId: run.workspace_id,
        companyId: run.resolved_company_id,
        analysisId: run.analysis_id,
        researchRunId: run.research_run_id,
        provider: getLanguageModelProvider(),
        usedFakeProvider: false,
        pendingOnly,
        promote: (id) => promoteViaPipelineAdmin("promote_signal_candidate", id),
      });
      await recordSignalOutcome(run, gate.claimHash, summary.promotedCount);
    } catch (error) {
      if (isRecoverableModelError(error)) {
        await insertResearchEvent({
          workspaceId: run.workspace_id,
          researchRunId: run.id,
          eventType: "pipeline_note",
          payload: {
            code: "MODEL_PROVIDER_TRANSIENT",
            phase: "generating_signals",
            detail: error instanceof Error ? error.message.slice(0, 240) : "unknown",
          },
        });
        await recordSignalOutcome(run, gate.claimHash, 0);
      } else if (!isSkipablePipelineGap(error)) {
        throw error;
      } else {
        await recordSignalOutcome(run, gate.claimHash, 0);
      }
    }
  }
  await persistPartialCounts(run);
  return (await transitionRun(run.workspace_id, run.id, "generating_signals", { status: "generating_intelligence" })) ?? run;
}

async function phaseIntelligence(run: ExternalResearchRunRow): Promise<ExternalResearchRunRow> {
  if (!run.analysis_id || !run.research_run_id || !run.resolved_company_id) throw new Error("PIPELINE_VALIDATION_FAILED");
  const shared = {
    companyId: run.resolved_company_id,
    analysisId: run.analysis_id,
    researchRunId: run.research_run_id,
    workspaceId: run.workspace_id,
    pipelineActor: true as const,
    provider: getLanguageModelProvider(),
  };
  try {
    await runAccountIntelligenceForCompany({
      ...shared,
      promote: (id) => promoteViaPipelineAdmin("promote_account_intelligence_candidate", id),
    });
  } catch (error) {
    if (!isSkipablePipelineGap(error)) throw error;
  }
  try {
    await runEfesoFitForCompany({
      ...shared,
      promote: (id) => promoteViaPipelineAdmin("promote_efeso_fit_candidate", id),
    });
  } catch (error) {
    if (!isSkipablePipelineGap(error)) throw error;
  }
  await persistPartialCounts(run);
  return (await transitionRun(run.workspace_id, run.id, "generating_intelligence", { status: "generating_opportunities" })) ?? run;
}

async function phaseOpportunities(run: ExternalResearchRunRow): Promise<ExternalResearchRunRow> {
  if (!run.analysis_id || !run.research_run_id || !run.resolved_company_id) throw new Error("PIPELINE_VALIDATION_FAILED");
  try {
    await runOpportunitiesForCompany({
      companyId: run.resolved_company_id,
      analysisId: run.analysis_id,
      researchRunId: run.research_run_id,
      workspaceId: run.workspace_id,
      pipelineActor: true,
      provider: getLanguageModelProvider(),
      promote: (id) => promoteViaPipelineAdmin("promote_opportunity_candidate", id),
    });
  } catch (error) {
    if (!isSkipablePipelineGap(error)) throw error;
    await insertResearchEvent({
      workspaceId: run.workspace_id,
      researchRunId: run.id,
      eventType: "pipeline_note",
      payload: { code: "NO_SUPPORTED_OPPORTUNITY", message: "Nenhuma oportunidade suficientemente sustentada" },
    });
    const latest = (await getResearchRun(run.workspace_id, run.id)) ?? run;
    await updateResearchRun(run.workspace_id, run.id, {
      resolution_payload: { ...latest.resolution_payload, no_supported_opportunity: true },
    });
  }
  await persistPartialCounts(run);
  return (await transitionRun(run.workspace_id, run.id, "generating_opportunities", { status: "generating_actions" })) ?? run;
}

async function phaseActions(run: ExternalResearchRunRow): Promise<ExternalResearchRunRow> {
  if (!run.analysis_id || !run.research_run_id || !run.resolved_company_id) throw new Error("PIPELINE_VALIDATION_FAILED");
  try {
    await runRecommendedActionsForCompany({
      companyId: run.resolved_company_id,
      analysisId: run.analysis_id,
      researchRunId: run.research_run_id,
      workspaceId: run.workspace_id,
      pipelineActor: true,
      provider: getLanguageModelProvider(),
      promote: (id) => promoteViaPipelineAdmin("promote_recommended_action_candidate", id),
    });
  } catch (error) {
    const message = errorDetail(error);
    const skipableAction =
      isRecoverableModelError(error) ||
      isSkipablePipelineGap(error) ||
      isInfrastructureObjectError(error) ||
      message.includes("SOURCE_SNAPSHOT_NOT_FOUND") ||
      (error instanceof Error && error.name === "PromotionError");
    if (skipableAction) {
      await insertResearchEvent({
        workspaceId: run.workspace_id,
        researchRunId: run.id,
        eventType: "pipeline_note",
        payload: {
          code: isRecoverableModelError(error) ? "MODEL_PROVIDER_TRANSIENT" : "ACTIONS_SKIPPED",
          phase: "generating_actions",
          detail: message.slice(0, 240) || "unknown",
        },
      });
    } else {
      throw error;
    }
  }
  const counts = await countPromotedPipeline(run.workspace_id, run.resolved_company_id, run.analysis_id);
  const partial = run.unavailable_source_count > 0;
  await updateCompanyLastResearched(run.workspace_id, run.resolved_company_id);
  await markAnalysisReady(run.workspace_id, run.analysis_id);
  await completeLegacyResearchRun(run.workspace_id, run.research_run_id, false);
  const updated = await transitionRun(run.workspace_id, run.id, "generating_actions", {
    status: partial ? "partial" : "completed",
    completed_at: new Date().toISOString(),
    failure_reason: partial ? "Pesquisa concluída com algumas fontes indisponíveis." : null,
    resolution_payload: { ...run.resolution_payload, counts },
  });
  await insertResearchEvent({
    workspaceId: run.workspace_id,
    researchRunId: run.id,
    eventType: partial ? "run_partial" : "run_completed",
    payload: { counts },
  });
  return updated ?? run;
}

async function finishPartial(run: ExternalResearchRunRow, code: ResearchFailureCode, message: string, unavailable: number) {
  if (run.resolved_company_id) await updateCompanyLastResearched(run.workspace_id, run.resolved_company_id);
  if (run.analysis_id) await markAnalysisReady(run.workspace_id, run.analysis_id);
  if (run.research_run_id) await completeLegacyResearchRun(run.workspace_id, run.research_run_id, false);
  await updateResearchRun(run.workspace_id, run.id, {
    status: "partial",
    failure_code: code,
    failure_reason: message,
    unavailable_source_count: unavailable,
    completed_at: new Date().toISOString(),
  });
  await insertResearchEvent({
    workspaceId: run.workspace_id,
    researchRunId: run.id,
    eventType: "run_partial",
    payload: { code },
  });
}

async function fail(run: ExternalResearchRunRow, code: ResearchFailureCode, message: string): Promise<ExternalResearchRunRow> {
  if (run.research_run_id) await completeLegacyResearchRun(run.workspace_id, run.research_run_id, true);
  const updated = await updateResearchRun(run.workspace_id, run.id, {
    status: "failed",
    failure_code: code,
    failure_reason: message,
    completed_at: new Date().toISOString(),
  });
  await insertResearchEvent({
    workspaceId: run.workspace_id,
    researchRunId: run.id,
    eventType: "run_failed",
    payload: { code },
  });
  return updated;
}

async function loadExisting(workspaceId: string): Promise<ExistingCompanyRecord[]> {
  const companies = await listWorkspaceCompanies(workspaceId);
  const aliases = await listCompanyAliases(workspaceId);
  const aliasByCompany = new Map<string, string[]>();
  for (const row of aliases) {
    const list = aliasByCompany.get(row.company_id) ?? [];
    list.push(row.alias);
    aliasByCompany.set(row.company_id, list);
  }
  return companies.map((row) => ({
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    domain: row.primary_domain,
    country: row.primary_country_code,
    industry: row.industry,
    aliases: aliasByCompany.get(row.id) ?? [],
  }));
}

async function ensureCompany(workspaceId: string, candidate: EntityCandidate): Promise<{ id: string; slug: string }> {
  if (candidate.existingCompanyId && candidate.existingSlug) {
    for (const alias of [candidate.canonicalName, ...candidate.aliases]) {
      await insertCompanyAlias(workspaceId, candidate.existingCompanyId, alias);
    }
    return { id: candidate.existingCompanyId, slug: candidate.existingSlug };
  }
  const companies = await listWorkspaceCompanies(workspaceId);
  const domainHit = candidate.officialDomain
    ? companies.find((row) => (row.primary_domain ?? "").replace(/^www\./, "") === candidate.officialDomain)
    : null;
  if (domainHit) return { id: domainHit.id, slug: domainHit.slug };
  let slug = candidate.officialDomain?.split(".")[0] || slugify(candidate.canonicalName);
  if (companies.some((row) => row.slug === slug)) slug = `${slug}-${candidate.headquartersCountry.toLowerCase() || "x"}`;
  const created = await insertCompany({
    workspaceId,
    slug,
    displayName: candidate.canonicalName,
    domain: candidate.officialDomain || null,
    country: candidate.headquartersCountry.slice(0, 2) || null,
    industry: candidate.industry,
  });
  for (const alias of [candidate.canonicalName, ...candidate.aliases]) {
    await insertCompanyAlias(workspaceId, created.id, alias);
  }
  return created;
}

function serializeCandidate(candidate: EntityCandidate) {
  return {
    canonicalName: candidate.canonicalName,
    officialDomain: candidate.officialDomain,
    headquartersCountry: candidate.headquartersCountry,
    industry: candidate.industry,
    aliases: candidate.aliases,
    existingCompanyId: candidate.existingCompanyId,
    existingSlug: candidate.existingSlug,
  };
}

function candidateFromPayload(run: ExternalResearchRunRow): EntityCandidate | null {
  const raw = run.resolution_payload.candidate;
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  return {
    canonicalName: String(row.canonicalName ?? run.requested_query),
    officialDomain: String(row.officialDomain ?? ""),
    headquartersCountry: String(row.headquartersCountry ?? ""),
    industry: String(row.industry ?? ""),
    aliases: Array.isArray(row.aliases) ? row.aliases.map(String) : [],
    decisionBasis: [],
    existingCompanyId: typeof row.existingCompanyId === "string" ? row.existingCompanyId : null,
    existingSlug: typeof row.existingSlug === "string" ? row.existingSlug : null,
  };
}

function failureCode(error: unknown): ResearchFailureCode {
  if (error instanceof TavilyProviderError) return error.code;
  const message = error instanceof Error ? error.message : "";
  if (
    error instanceof ModelProviderUnavailableError ||
    error instanceof ModelIncompleteResponseError ||
    message === "OLLAMA_UNAVAILABLE" ||
    message === "OLLAMA_MODEL_NOT_CONFIGURED"
  ) {
    return getLanguageModelProviderName() === "openai"
      ? message.includes("not configured")
        ? "OPENAI_NOT_CONFIGURED"
        : "OPENAI_FAILED"
      : "LOCAL_MODEL_UNAVAILABLE";
  }
  if (message === "TAVILY_AUTH_FAILED" || message === "TAVILY_RATE_LIMITED" || message === "TAVILY_TIMEOUT" || message === "TAVILY_PROVIDER_ERROR") {
    return message;
  }
  if (message.includes("OPENAI") || (getLanguageModelProviderName() === "openai" && message.includes("not configured"))) {
    return "OPENAI_NOT_CONFIGURED";
  }
  if (message.includes("CLAIMS_NOT_FOUND") || message.includes("SIGNALS_NOT_FOUND")) return "PIPELINE_VALIDATION_FAILED";
  if (message === "QUOTA_EXCEEDED") return "QUOTA_EXCEEDED";
  if (message === "PARSER_UNSUPPORTED") return "PARSER_UNSUPPORTED";
  return "PIPELINE_VALIDATION_FAILED";
}

/** Ollama/OpenAI transient failures — do not discard an otherwise valid research run. */
function isRecoverableModelError(error: unknown): boolean {
  if (
    error instanceof ModelProviderUnavailableError ||
    error instanceof ModelIncompleteResponseError ||
    error instanceof ModelRefusalError
  ) {
    return true;
  }
  // Defend against duplicate class identities across bundler boundaries.
  const name = error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name) : "";
  if (
    name === "ModelProviderUnavailableError" ||
    name === "ModelIncompleteResponseError" ||
    name === "ModelRefusalError" ||
    name === "AbortError" ||
    name === "TimeoutError"
  ) {
    return true;
  }
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /OLLAMA_UNAVAILABLE|OLLAMA_MODEL_NOT_CONFIGURED|did not return JSON|timed out|incomplete/i.test(message);
}

function publicFailureMessage(code: ResearchFailureCode): string {
  switch (code) {
    case "OPENAI_NOT_CONFIGURED":
      return OPENAI_PARTIAL_MESSAGE;
    case "LOCAL_MODEL_UNAVAILABLE":
      return LOCAL_MODEL_MESSAGE;
    case "OPENAI_FAILED":
      return "A geração de inteligência falhou. Tente novamente mais tarde.";
    case "NO_RELIABLE_SOURCES":
      return "Não encontramos fontes públicas suficientemente confiáveis.";
    case "SOURCE_FETCH_FAILED":
      return "Não foi possível acessar as fontes encontradas.";
    case "PROVIDER_NOT_CONFIGURED":
      return "A pesquisa externa ainda não está configurada neste ambiente.";
    case "TAVILY_AUTH_FAILED":
    case "TAVILY_RATE_LIMITED":
    case "TAVILY_TIMEOUT":
    case "TAVILY_PROVIDER_ERROR":
      return TAVILY_UNAVAILABLE_MESSAGE;
    case "QUOTA_EXCEEDED":
      return "O limite de pesquisas foi atingido. Tente novamente mais tarde.";
    default:
      return "Não foi possível concluir a pesquisa.";
  }
}

function fetchStatus(error: unknown): "unavailable" | "failed" {
  if (error instanceof UnsafeFetchError && (error.code === "UNAVAILABLE" || error.code === "UNSUPPORTED_MIME")) {
    return "unavailable";
  }
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAVAILABLE" || message === "PARSER_UNSUPPORTED") return "unavailable";
  return "failed";
}

async function persistPartialCounts(run: ExternalResearchRunRow): Promise<void> {
  if (!run.resolved_company_id || !run.analysis_id) return;
  const latest = (await getResearchRun(run.workspace_id, run.id)) ?? run;
  const counts = await countPromotedPipeline(run.workspace_id, run.resolved_company_id, run.analysis_id);
  await updateResearchRun(run.workspace_id, run.id, {
    resolution_payload: { ...latest.resolution_payload, counts },
  });
}

async function persistHeartbeat(run: ExternalResearchRunRow): Promise<ExternalResearchRunRow> {
  const latest = (await getResearchRun(run.workspace_id, run.id)) ?? run;
  const counts =
    latest.resolved_company_id && latest.analysis_id
      ? await countPromotedPipeline(latest.workspace_id, latest.resolved_company_id, latest.analysis_id)
      : latest.resolution_payload.counts;
  return updateResearchRun(latest.workspace_id, latest.id, {
    resolution_payload: {
      ...latest.resolution_payload,
      counts,
      heartbeat_at: new Date().toISOString(),
      heartbeat_status: latest.status,
    },
  });
}

async function progressiveGate(run: ExternalResearchRunRow): Promise<{ ok: boolean; claimHash: string; claimIds: string[] }> {
  if (!run.analysis_id || !run.resolved_company_id) return { ok: false, claimHash: "", claimIds: [] };
  const claims = await listClaimsForSignalExtraction({
    workspaceId: run.workspace_id,
    companyId: run.resolved_company_id,
    analysisId: run.analysis_id,
  });
  const claimIds = claims.map((claim) => claim.id);
  const claimHash = sha256Json({ claim_ids: [...claimIds].sort() });
  if (claims.length < 2) return { ok: false, claimHash, claimIds };
  if (claims.some((claim) => claim.company_id !== run.resolved_company_id || claim.claim_status !== "active")) {
    return { ok: false, claimHash, claimIds };
  }
  const evidence = await listEvidenceQuotesForClaims(claimIds);
  if (evidence.length === 0) return { ok: false, claimHash, claimIds };
  const sources = await listSourceCandidates(run.id);
  const accepted = sources.filter((row) => row.status === "fetched" || row.status === "accepted");
  const good = accepted.filter((row) => row.source_quality === "primary" || row.source_quality === "authoritative_secondary");
  if (accepted.length === 0 || (good.length === 0 && accepted.every((row) => row.source_quality === "weak"))) {
    return { ok: false, claimHash, claimIds };
  }
  return { ok: true, claimHash, claimIds };
}

async function recordSignalOutcome(run: ExternalResearchRunRow, claimHash: string, promotedCount: number): Promise<void> {
  const latest = (await getResearchRun(run.workspace_id, run.id)) ?? run;
  const insufficient = promotedCount < 1;
  if (insufficient) {
    await insertResearchEvent({
      workspaceId: run.workspace_id,
      researchRunId: run.id,
      eventType: "pipeline_note",
      payload: { code: "INSUFFICIENT_EVIDENCE_FOR_SIGNAL" },
    });
  }
  await updateResearchRun(run.workspace_id, run.id, {
    resolution_payload: {
      ...latest.resolution_payload,
      signals_claim_hash: claimHash,
      insufficient_evidence_for_signal: insufficient,
      first_intelligence_claim_hash: claimHash,
      first_intelligence_at: new Date().toISOString(),
    },
  });
}

async function maybeGenerateFirstUsefulIntelligence(run: ExternalResearchRunRow): Promise<void> {
  const latest = (await getResearchRun(run.workspace_id, run.id)) ?? run;
  if (latest.resolution_payload.progressive_generation) return;
  const gate = await progressiveGate(latest);
  if (!gate.ok) return;
  if (latest.resolution_payload.first_intelligence_claim_hash === gate.claimHash) return;
  await updateResearchRun(latest.workspace_id, latest.id, {
    resolution_payload: { ...latest.resolution_payload, progressive_generation: true },
  });
  try {
    if (!latest.analysis_id || !latest.research_run_id || !latest.resolved_company_id) return;
    let promotedSignals = 0;
    try {
      const summary = await executeSignalExtraction({
        workspaceId: latest.workspace_id,
        companyId: latest.resolved_company_id,
        analysisId: latest.analysis_id,
        researchRunId: latest.research_run_id,
        provider: getLanguageModelProvider(),
        usedFakeProvider: false,
        promote: (id) => promoteViaPipelineAdmin("promote_signal_candidate", id),
      });
      promotedSignals = summary.promotedCount;
    } catch (error) {
      if (isRecoverableModelError(error)) {
        await insertResearchEvent({
          workspaceId: latest.workspace_id,
          researchRunId: latest.id,
          eventType: "pipeline_note",
          payload: {
            code: "MODEL_PROVIDER_TRANSIENT",
            phase: "progressive_signal_extraction",
            detail: error instanceof Error ? error.message.slice(0, 240) : "unknown",
          },
        });
        return;
      }
      if (!isSkipablePipelineGap(error)) throw error;
    }
    await recordSignalOutcome(latest, gate.claimHash, promotedSignals);
    if (promotedSignals < 1) return;
    const shared = {
      companyId: latest.resolved_company_id,
      analysisId: latest.analysis_id,
      researchRunId: latest.research_run_id,
      workspaceId: latest.workspace_id,
      pipelineActor: true as const,
      provider: getLanguageModelProvider(),
    };
    try {
      await runAccountIntelligenceForCompany({
        ...shared,
        promote: (id) => promoteViaPipelineAdmin("promote_account_intelligence_candidate", id),
      });
    } catch (error) {
      if (!isSkipablePipelineGap(error)) throw error;
    }
    try {
      await runEfesoFitForCompany({
        ...shared,
        promote: (id) => promoteViaPipelineAdmin("promote_efeso_fit_candidate", id),
      });
    } catch (error) {
      if (!isSkipablePipelineGap(error)) throw error;
    }
    try {
      await runOpportunitiesForCompany({
        ...shared,
        promote: (id) => promoteViaPipelineAdmin("promote_opportunity_candidate", id),
      });
    } catch (error) {
      if (!isSkipablePipelineGap(error)) throw error;
      await insertResearchEvent({
        workspaceId: latest.workspace_id,
        researchRunId: latest.id,
        eventType: "pipeline_note",
        payload: { code: "NO_SUPPORTED_OPPORTUNITY", message: "Nenhuma oportunidade suficientemente sustentada" },
      });
    }
    try {
      await runRecommendedActionsForCompany({
        ...shared,
        promote: (id) => promoteViaPipelineAdmin("promote_recommended_action_candidate", id),
      });
    } catch (error) {
      if (error instanceof ModelProviderUnavailableError) throw error;
      if (!isSkipablePipelineGap(error)) throw error;
    }
  } finally {
    const after = (await getResearchRun(run.workspace_id, run.id)) ?? latest;
    await updateResearchRun(run.workspace_id, run.id, {
      resolution_payload: { ...after.resolution_payload, progressive_generation: false },
    });
  }
}

function isSkipablePipelineGap(error: unknown): boolean {
  const message = errorDetail(error);
  return (
    message === "SIGNALS_NOT_FOUND" ||
    message === "CLAIMS_NOT_FOUND" ||
    message === "SOURCE_SNAPSHOT_NOT_FOUND" ||
    message === "ACCOUNT_INTELLIGENCE_NOT_FOUND" ||
    message === "EFESO_FIT_NOT_FOUND" ||
    message === "FITS_NOT_FOUND" ||
    message === "OPPORTUNITIES_NOT_FOUND" ||
    /PromotionError|promotion RPC/i.test(message)
  );
}

function errorDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const row = error as { message?: unknown; error?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    if (typeof row.message === "string" && row.message.trim()) return row.message;
    if (typeof row.error === "string" && row.error.trim()) return row.error;
    try {
      return JSON.stringify(error);
    } catch {
      return "unknown_object_error";
    }
  }
  return String(error);
}

function isInfrastructureObjectError(error: unknown): boolean {
  if (error instanceof Error) return false;
  if (!error || typeof error !== "object") return false;
  const row = error as { message?: unknown; code?: unknown; details?: unknown };
  return typeof row.message === "string" || typeof row.code === "string" || typeof row.details === "string";
}

export async function companySlugForRun(run: ExternalResearchRunRow): Promise<string | null> {
  if (!run.resolved_company_id) return null;
  return getCompanySlug(run.workspace_id, run.resolved_company_id);
}
