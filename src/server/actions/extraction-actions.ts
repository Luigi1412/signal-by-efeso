"use server";

import { z } from "zod";
import { publicExtractionErrorMessage } from "@/server/ai/errors";
import { isControlledExtractionEnabled } from "@/server/ai/config";
import { runControlledExtractionFromUpload } from "@/server/services/controlled-intelligence-extraction-service";
import { assertEfesoAdmin, publicAccessErrorMessage } from "@/server/access/require-efeso-access";
import type { ControlledExtractionSummary } from "@/types/controlled-extraction";

const sourceTypeValues = [
  "annual_report",
  "earnings_release",
  "investor_presentation",
  "regulatory_filing",
  "corporate_page",
  "corporate_press_release",
  "government",
  "industry_association",
  "trade_press",
  "business_press",
  "news",
  "job_posting",
  "linkedin_company",
  "linkedin_person",
  "partner_supplier",
  "academic",
  "internal_efeso",
  "other",
] as const;

const formSchema = z.object({
  analysisId: z.string().uuid(),
  researchRunId: z.string().uuid(),
  publisherName: z.string().trim().min(1).max(300),
  sourceType: z.enum(sourceTypeValues),
  sourceTier: z.enum(["A", "B", "C", "D", "E"]),
  canonicalUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
});

export async function processControlledDocumentAction(
  formData: FormData,
): Promise<{ ok: true; summary: ControlledExtractionSummary } | { ok: false; error: string }> {
  try {
    await assertEfesoAdmin();
  } catch (error) {
    return { ok: false, error: publicAccessErrorMessage(error) };
  }
  if (!isControlledExtractionEnabled()) {
    return { ok: false, error: "A extração controlada está desativada." };
  }

  const parsed = formSchema.safeParse({
    analysisId: formData.get("analysisId"),
    researchRunId: formData.get("researchRunId"),
    publisherName: formData.get("publisherName"),
    sourceType: formData.get("sourceType"),
    sourceTier: formData.get("sourceTier"),
    canonicalUrl: formData.get("canonicalUrl") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: "Dados do formulário inválidos." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo .txt ou .pdf." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const summary = await runControlledExtractionFromUpload({
      analysisId: parsed.data.analysisId,
      researchRunId: parsed.data.researchRunId,
      fileName: file.name,
      bytes,
      declaredMime: file.type,
      publisherName: parsed.data.publisherName,
      sourceType: parsed.data.sourceType,
      sourceTier: parsed.data.sourceTier,
      canonicalUrl: parsed.data.canonicalUrl || null,
    });
    return { ok: true, summary };
  } catch (error) {
    return { ok: false, error: publicExtractionErrorMessage(error) };
  }
}
