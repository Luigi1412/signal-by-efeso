"use server";

import { z } from "zod";
import { publicExtractionErrorMessage } from "@/server/ai/errors";
import { isControlledExtractionEnabled } from "@/server/ai/config";
import { runSignalExtractionForCompany } from "@/server/services/signal-extraction-service";
import { assertEfesoAdmin, publicAccessErrorMessage } from "@/server/access/require-efeso-access";
import type { SignalExtractionSummary } from "@/server/signals/types";

const formSchema = z.object({
  companyId: z.string().uuid(),
  analysisId: z.string().uuid(),
  researchRunId: z.string().uuid(),
  useFakeProvider: z.boolean(),
  claimIds: z.array(z.string().uuid()),
});

export async function processSignalExtractionAction(
  formData: FormData,
): Promise<{ ok: true; summary: SignalExtractionSummary } | { ok: false; error: string }> {
  try {
    await assertEfesoAdmin();
  } catch (error) {
    return { ok: false, error: publicAccessErrorMessage(error) };
  }
  if (!isControlledExtractionEnabled()) {
    return { ok: false, error: "A extração controlada está desativada." };
  }

  const claimIds = formData
    .getAll("claimIds")
    .map((value) => String(value))
    .filter(Boolean);
  const parsed = formSchema.safeParse({
    companyId: formData.get("companyId"),
    analysisId: formData.get("analysisId"),
    researchRunId: formData.get("researchRunId"),
    useFakeProvider: formData.get("useFakeProvider") === "on" || formData.get("useFakeProvider") === "true",
    claimIds,
  });
  if (!parsed.success) {
    return { ok: false, error: "Dados do formulário inválidos." };
  }

  try {
    const summary = await runSignalExtractionForCompany({
      companyId: parsed.data.companyId,
      analysisId: parsed.data.analysisId,
      researchRunId: parsed.data.researchRunId,
      claimIds: parsed.data.claimIds.length > 0 ? parsed.data.claimIds : undefined,
      useFakeProvider: parsed.data.useFakeProvider,
    });
    return { ok: true, summary };
  } catch (error) {
    if (error instanceof Error && error.message === "CLAIMS_NOT_FOUND") {
      return { ok: false, error: "Não há Claims ativos para esta empresa/análise. Processe evidência no laboratório de extração primeiro." };
    }
    if (error instanceof Error && error.message === "SOURCE_SNAPSHOT_NOT_FOUND") {
      return { ok: false, error: "Não há SourceSnapshot associado a estes Claims. O Signal Engine não faz upload de documento." };
    }
    if (error instanceof Error && error.message === "COMPANY_NOT_FOUND") {
      return { ok: false, error: "Empresa não encontrada neste workspace." };
    }
    return { ok: false, error: publicExtractionErrorMessage(error) };
  }
}
