"use server";

import { z } from "zod";
import { publicExtractionErrorMessage } from "@/server/ai/errors";
import { isControlledExtractionEnabled } from "@/server/ai/config";
import { runOpportunitiesForCompany } from "@/server/services/opportunity-extraction-service";
import { assertEfesoAdmin, publicAccessErrorMessage } from "@/server/access/require-efeso-access";
import type { OpportunitySummary } from "@/server/opportunities/types";

const formSchema = z.object({
  companyId: z.string().uuid(),
  analysisId: z.string().uuid(),
  researchRunId: z.string().uuid(),
  useFakeProvider: z.boolean(),
});

function labPipelineError(error: unknown): string {
  if (error instanceof Error && error.message === "SIGNALS_NOT_FOUND") {
    return "Não há Signals ativos para esta empresa.";
  }
  if (error instanceof Error && error.message === "FITS_NOT_FOUND") {
    return "Não há EFESO Fits ativos para esta empresa.";
  }
  if (error instanceof Error && error.message === "SOURCE_SNAPSHOT_NOT_FOUND") {
    return "Não há SourceSnapshot associado a esta análise.";
  }
  if (error instanceof Error && error.message === "COMPANY_NOT_FOUND") {
    return "Empresa não encontrada neste workspace.";
  }
  if (error instanceof Error && error.message === "ANALYSIS_NOT_FOUND") {
    return "Análise não encontrada neste workspace.";
  }
  if (error instanceof Error && error.message === "COMPANY_ANALYSIS_MISMATCH") {
    return "A análise selecionada não pertence a esta empresa.";
  }
  if (error instanceof Error && error.message === "RESEARCH_RUN_NOT_FOUND") {
    return "ResearchRun não encontrado para esta análise.";
  }
  const base = publicExtractionErrorMessage(error);
  if (error instanceof Error && error.message && base === "Não foi possível concluir a extração controlada.") {
    return `${base} ${error.message}`;
  }
  return base;
}

export async function processOpportunityAction(
  formData: FormData,
): Promise<{ ok: true; summary: OpportunitySummary } | { ok: false; error: string }> {
  try {
    await assertEfesoAdmin();
  } catch (error) {
    return { ok: false, error: publicAccessErrorMessage(error) };
  }
  if (!isControlledExtractionEnabled()) {
    return { ok: false, error: "A extração controlada está desativada." };
  }
  const parsed = formSchema.safeParse({
    companyId: formData.get("companyId"),
    analysisId: formData.get("analysisId"),
    researchRunId: formData.get("researchRunId"),
    useFakeProvider: formData.get("useFakeProvider") === "on" || formData.get("useFakeProvider") === "true",
  });
  if (!parsed.success) return { ok: false, error: "Dados do formulário inválidos." };
  try {
    const summary = await runOpportunitiesForCompany(parsed.data);
    return { ok: true, summary };
  } catch (error) {
    return { ok: false, error: labPipelineError(error) };
  }
}
