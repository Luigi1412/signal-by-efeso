"use server";

import { z } from "zod";
import { publicExtractionErrorMessage } from "@/server/ai/errors";
import { isControlledExtractionEnabled } from "@/server/ai/config";
import { runKnowledgeExtractionForSnapshot } from "@/server/services/efeso-knowledge-extraction-service";
import { reviewKnowledgeObject } from "@/server/services/efeso-knowledge-service";
import { assertEfesoAdmin, publicAccessErrorMessage } from "@/server/access/require-efeso-access";
import type { KnowledgeExtractionSummary } from "@/types/efeso-knowledge";

const formSchema = z.object({
  analysisId: z.string().uuid(),
  researchRunId: z.string().uuid(),
  sourceSnapshotId: z.string().uuid(),
});

export async function processKnowledgeSnapshotAction(
  formData: FormData,
): Promise<{ ok: true; summary: KnowledgeExtractionSummary } | { ok: false; error: string }> {
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
    sourceSnapshotId: formData.get("sourceSnapshotId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Dados do formulário inválidos." };
  }

  try {
    const summary = await runKnowledgeExtractionForSnapshot(parsed.data);
    return { ok: true, summary };
  } catch (error) {
    if (error instanceof Error && error.message === "SOURCE_CONTENT_BLOCKS_NOT_FOUND") {
      return { ok: false, error: "Este snapshot ainda não tem blocos. Processe o documento no laboratório de extração." };
    }
    if (error instanceof Error && error.message === "SOURCE_SNAPSHOT_NOT_FOUND") {
      return { ok: false, error: "SourceSnapshot não encontrado neste workspace." };
    }
    return { ok: false, error: publicExtractionErrorMessage(error) };
  }
}

const reviewSchema = z.object({
  objectId: z.string().uuid(),
  action: z.enum(["approve", "archive"]),
});

export async function reviewKnowledgeObjectAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertEfesoAdmin();
  } catch (error) {
    return { ok: false, error: publicAccessErrorMessage(error) };
  }
  const parsed = reviewSchema.safeParse({
    objectId: formData.get("objectId"),
    action: formData.get("action"),
  });
  if (!parsed.success) return { ok: false, error: "Dados do formulário inválidos." };
  try {
    await reviewKnowledgeObject({ id: parsed.data.objectId, action: parsed.data.action });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: publicAccessErrorMessage(error) };
  }
}
