import "server-only";
import {
  currentUser,
  getCompanies,
  getCompanyById,
  getCompanyBySlug,
  recentAnalyses as mockRecentAnalyses,
  researchPhases,
} from "@/data";
import { allowMockFallback, isSupabaseConfigured } from "@/lib/supabase/env";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import {
  completedCountFromRun,
  geographyToCountryCode,
  researchFocusToDb,
  stageForPhaseIndex,
  toCurrentUser,
  toRecentAnalysis,
  toUiCompany,
} from "@/server/mapping";
import * as analysisRepository from "@/server/repositories/analysis-repository";
import * as companyRepository from "@/server/repositories/company-repository";
import * as profileRepository from "@/server/repositories/profile-repository";
import * as researchRunRepository from "@/server/repositories/research-run-repository";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { getAuthState, requireAuthUserId } from "@/server/session";
import type { CreateDraftAnalysisInput } from "@/server/validation";
import type { Company, CurrentUser, RecentAnalysis } from "@/types";
import type { AnalysisRecord, ResearchRunRecord } from "@/types/database";

export type DraftAnalysisResult =
  | { ok: true; slug: string; analysisId: string }
  | { ok: false; reason: "unavailable"; query: string }
  | { ok: false; reason: "unauthenticated" }
  | { ok: false; reason: "not_configured" };

const UNAVAILABLE_USER: CurrentUser = {
  name: "Sessão indisponível",
  role: "",
  organization: "EFESO Brasil",
  initials: "—",
};

export async function getSidebarUser(): Promise<CurrentUser> {
  if (!isSupabaseConfigured()) {
    if (allowMockFallback()) return currentUser;
    return UNAVAILABLE_USER;
  }
  try {
    const [profile, workspace] = await Promise.all([
      profileRepository.getCurrentProfile(),
      workspaceRepository.getCurrentWorkspace(),
    ]);
    if (profile) return toCurrentUser(profile, workspace);
    if (allowMockFallback()) return currentUser;
    return UNAVAILABLE_USER;
  } catch {
    if (allowMockFallback()) return currentUser;
    return UNAVAILABLE_USER;
  }
}

export async function createDraftAnalysis(input: CreateDraftAnalysisInput): Promise<DraftAnalysisResult> {
  const auth = await getAuthState();
  if (auth.kind === "unavailable") return { ok: false, reason: "not_configured" };
  if (auth.kind === "anonymous") return { ok: false, reason: "unauthenticated" };
  const userId = auth.id;

  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) return { ok: false, reason: "unavailable", query: input.companyQuery };

  const company = await companyRepository.resolveCompany(workspace.id, input.companyQuery);
  if (!company) return { ok: false, reason: "unavailable", query: input.companyQuery };

  const analysis = await analysisRepository.createDraftAnalysis({
    workspaceId: workspace.id,
    companyId: company.id,
    createdByUserId: userId,
    title: company.display_name,
    researchFocus: researchFocusToDb[input.focus],
    primaryCountryCode: geographyToCountryCode(input.geography),
    additionalInstructions: input.additionalInstructions,
  });

  return { ok: true, slug: company.slug, analysisId: analysis.id };
}

export async function confirmCompanyAndStartResearch(analysisId: string): Promise<{
  slug: string;
  analysisId: string;
  runId: string;
}> {
  const userId = await requireAuthUserId();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new Error("WORKSPACE_NOT_FOUND");

  const analysis = await analysisRepository.getAnalysisById(workspace.id, analysisId);
  if (!analysis) throw new Error("ANALYSIS_NOT_FOUND");

  const company = await companyRepository.getCompanyById(workspace.id, analysis.company_id);
  if (!company) throw new Error("COMPANY_NOT_FOUND");

  const existing = await researchRunRepository.getLatestRunForAnalysis(workspace.id, analysis.id);
  if (existing) {
    if (analysis.status === "draft") {
      await analysisRepository.updateAnalysisStatus(workspace.id, analysis.id, "researching");
    }
    return { slug: company.slug, analysisId: analysis.id, runId: existing.id };
  }

  await analysisRepository.updateAnalysisStatus(workspace.id, analysis.id, "researching");
  const run = await researchRunRepository.createResearchRun({
    workspaceId: workspace.id,
    analysisId: analysis.id,
    requestedByUserId: userId,
    runType: "initial",
    status: "researching",
    currentStage: "entity_resolution",
    progressPercent: 0,
    startedAt: new Date().toISOString(),
  });

  return { slug: company.slug, analysisId: analysis.id, runId: run.id };
}

export async function persistResearchProgress(input: {
  analysisId: string;
  runId: string;
  phaseIndex: number;
}): Promise<void> {
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new Error("WORKSPACE_NOT_FOUND");

  const run = await researchRunRepository.getResearchRun(workspace.id, input.runId);
  if (!run || run.analysis_id !== input.analysisId) throw new Error("RUN_NOT_FOUND");
  if (run.status === "completed") return;

  const stage = stageForPhaseIndex(input.phaseIndex);
  if (run.progress_percent > stage.progressPercent) return;

  await researchRunRepository.updateResearchRunProgress({
    workspaceId: workspace.id,
    runId: run.id,
    status: "researching",
    currentStage: stage.stage,
    progressPercent: stage.progressPercent,
  });
}

export async function completePersistedResearch(input: { analysisId: string; runId: string }): Promise<void> {
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new Error("WORKSPACE_NOT_FOUND");

  const run = await researchRunRepository.getResearchRun(workspace.id, input.runId);
  if (!run || run.analysis_id !== input.analysisId) throw new Error("RUN_NOT_FOUND");

  if (run.status !== "completed") {
    await researchRunRepository.completeResearchRun({
      workspaceId: workspace.id,
      runId: run.id,
    });
  }

  await analysisRepository.updateAnalysisStatus(workspace.id, input.analysisId, "ready");
}

export async function getResearchContext(
  slug: string,
  analysisId: string | undefined,
  runId: string | undefined,
): Promise<{
  company: Company;
  analysis: AnalysisRecord | null;
  run: ResearchRunRecord | null;
  initialCompletedCount: number;
} | null> {
  const mockCompany = getCompanyBySlug(slug) ?? null;
  if (!mockCompany) return null;

  if (!isSupabaseConfigured() || !analysisId) {
    return { company: mockCompany, analysis: null, run: null, initialCompletedCount: 0 };
  }

  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) {
    return { company: mockCompany, analysis: null, run: null, initialCompletedCount: 0 };
  }

  const analysis = await analysisRepository.getAnalysisById(workspace.id, analysisId);
  const run = runId
    ? await researchRunRepository.getResearchRun(workspace.id, runId)
    : analysis
      ? await researchRunRepository.getLatestRunForAnalysis(workspace.id, analysis.id)
      : null;

  return {
    company: mockCompany,
    analysis,
    run,
    initialCompletedCount: run ? completedCountFromRun(run, researchPhases.length) : 0,
  };
}

export async function getMergedRecentAnalysisRows(): Promise<{ analysis: RecentAnalysis; company: Company }[]> {
  const mockRows: { analysis: RecentAnalysis; company: Company }[] = [];
  for (const analysis of mockRecentAnalyses) {
    const company = getCompanyById(analysis.companyId);
    if (!company) continue;
    mockRows.push({ analysis: { ...analysis, source: "demo" }, company });
  }

  if (!isSupabaseConfigured()) {
    if (allowMockFallback()) return mockRows;
    throw new PersistenceUnavailableError();
  }

  try {
    const auth = await getAuthState();
    if (auth.kind === "unavailable") {
      if (allowMockFallback()) return mockRows;
      throw new PersistenceUnavailableError();
    }
    if (auth.kind === "anonymous") {
      if (allowMockFallback()) return mockRows;
      return [];
    }
    const workspace = await workspaceRepository.getCurrentWorkspace();
    if (!workspace) {
      if (allowMockFallback()) return mockRows;
      return [];
    }

    const persisted = await analysisRepository.getRecentAnalyses(workspace.id);
    const companies = await companyRepository.getCompaniesForWorkspace(workspace.id);
    const companyById = new Map(companies.map((c) => [c.id, c]));

    const persistedRows: { analysis: RecentAnalysis; company: Company }[] = [];
    const seenSlugs = new Set<string>();
    for (const record of persisted) {
      const row = companyById.get(record.company_id);
      if (!row || seenSlugs.has(row.slug)) continue;
      seenSlugs.add(row.slug);
      const company = toUiCompany(row);
      const run = await researchRunRepository.getLatestRunForAnalysis(workspace.id, record.id);
      persistedRows.push({ analysis: toRecentAnalysis(record, company, run), company });
    }

    if (!allowMockFallback()) return persistedRows;

    const persistedSlugs = new Set(persistedRows.map((r) => r.company.slug));
    const remainingMock = mockRows.filter((r) => !persistedSlugs.has(r.company.slug));
    return [...persistedRows, ...remainingMock];
  } catch (error) {
    if (error instanceof PersistenceUnavailableError) throw error;
    if (allowMockFallback()) return mockRows;
    throw new PersistenceUnavailableError();
  }
}

export async function getWorkspaceCompanies(): Promise<Company[]> {
  if (!isSupabaseConfigured()) {
    if (allowMockFallback()) return getCompanies();
    throw new PersistenceUnavailableError();
  }
  try {
    const auth = await getAuthState();
    if (auth.kind === "unavailable") {
      if (allowMockFallback()) return getCompanies();
      throw new PersistenceUnavailableError();
    }
    if (auth.kind === "anonymous") {
      if (allowMockFallback()) return getCompanies();
      return [];
    }
    const workspace = await workspaceRepository.getCurrentWorkspace();
    if (!workspace) {
      if (allowMockFallback()) return getCompanies();
      return [];
    }
    const rows = await companyRepository.getCompaniesForWorkspace(workspace.id);
    return rows.map(toUiCompany);
  } catch (error) {
    if (error instanceof PersistenceUnavailableError) throw error;
    if (allowMockFallback()) return getCompanies();
    throw new PersistenceUnavailableError();
  }
}
