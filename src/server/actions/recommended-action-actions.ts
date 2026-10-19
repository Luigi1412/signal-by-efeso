"use server";

import { z } from "zod";
import { publicExtractionErrorMessage } from "@/server/ai/errors";
import { isControlledExtractionEnabled } from "@/server/ai/config";
import { runRecommendedActionsForCompany } from "@/server/services/recommended-action-extraction-service";
import { assertEfesoAdmin, publicAccessErrorMessage } from "@/server/access/require-efeso-access";
import type { RecommendedActionSummary } from "@/server/recommended-actions/types";

const formSchema = z.object({
  companyId: z.string().uuid(),
  analysisId: z.string().uuid(),
  researchRunId: z.string().uuid(),
  useFakeProvider: z.boolean(),
});

export async function processRecommendedActionLab(
  formData: FormData,
): Promise<{ ok: true; summary: RecommendedActionSummary } | { ok: false; error: string }> {
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
    const summary = await runRecommendedActionsForCompany(parsed.data);
    return { ok: true, summary };
  } catch (error) {
    return { ok: false, error: publicExtractionErrorMessage(error) };
  }
}
