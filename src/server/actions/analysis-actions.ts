"use server";

import { redirect } from "next/navigation";
import { allowMockFallback } from "@/lib/supabase/env";
import { routes } from "@/lib/routes";
import {
  completePersistedResearch,
  confirmCompanyAndStartResearch,
  createDraftAnalysis,
  persistResearchProgress,
} from "@/server/services/analysis-service";
import {
  completeResearchInput,
  confirmAnalysisInput,
  createDraftAnalysisInput,
  persistResearchProgressInput,
  type CreateDraftAnalysisInput,
} from "@/server/validation";

export type StartAnalysisActionResult =
  | { ok: true; slug: string; analysisId: string }
  | { ok: false; reason: "unauthenticated" | "not_configured" | "invalid" | "fallback" };

export async function startAnalysisAction(raw: CreateDraftAnalysisInput): Promise<StartAnalysisActionResult> {
  const parsed = createDraftAnalysisInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const result = await createDraftAnalysis(parsed.data);

  if (result.ok) {
    return { ok: true, slug: result.slug, analysisId: result.analysisId };
  }

  if (result.reason === "unavailable") {
    redirect(`${routes.analysisUnavailable}?q=${encodeURIComponent(result.query)}`);
  }

  if (result.reason === "unauthenticated") {
    return { ok: false, reason: "unauthenticated" };
  }

  if (allowMockFallback()) {
    return { ok: false, reason: "fallback" };
  }
  return { ok: false, reason: "not_configured" };
}

export async function confirmCompanyAction(analysisId: string): Promise<{ error: string } | void> {
  const parsed = confirmAnalysisInput.safeParse({ analysisId });
  if (!parsed.success) return { error: "Identificador de análise inválido." };

  let result: { slug: string; analysisId: string; runId: string };
  try {
    result = await confirmCompanyAndStartResearch(parsed.data.analysisId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível confirmar a empresa.";
    if (message === "UNAUTHENTICATED") {
      return { error: "Entre com a conta EFESO para continuar." };
    }
    return { error: message };
  }

  redirect(
    `${routes.analysisResearch(result.slug)}?analysis=${encodeURIComponent(result.analysisId)}&run=${encodeURIComponent(result.runId)}`,
  );
}

export async function persistResearchProgressAction(raw: {
  runId: string;
  analysisId: string;
  phaseIndex: number;
}): Promise<{ error?: string }> {
  const parsed = persistResearchProgressInput.safeParse(raw);
  if (!parsed.success) return { error: "Progresso inválido." };
  try {
    await persistResearchProgress(parsed.data);
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao persistir progresso.";
    return { error: message };
  }
}

export async function completeResearchAction(raw: {
  runId: string;
  analysisId: string;
}): Promise<{ error?: string }> {
  const parsed = completeResearchInput.safeParse(raw);
  if (!parsed.success) return { error: "Identificadores inválidos." };
  try {
    await completePersistedResearch(parsed.data);
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao concluir a pesquisa.";
    return { error: message };
  }
}
