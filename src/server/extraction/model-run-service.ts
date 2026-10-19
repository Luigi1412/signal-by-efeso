import "server-only";
import type { z } from "zod";
import type { LanguageModelProvider, StructuredGenerationRequest } from "@/server/ai/language-model-provider";
import { ModelIncompleteResponseError, ModelRefusalError } from "@/server/ai/errors";
import { sha256Json } from "@/server/extraction/sha256";
import { completeModelRun, createRunningModelRun } from "./pipeline-persistence";
import type { ModelRunRow } from "./pipeline-rows";

export async function executeStructuredModelRun<T extends z.ZodType>(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  provider: LanguageModelProvider;
  request: StructuredGenerationRequest<T>;
  inputManifest: Record<string, unknown>;
}): Promise<{ run: ModelRunRow; parsed: z.infer<T> }> {
  const inputHash = sha256Json({
    prompt_version: input.request.promptVersion,
    schema_version: input.request.schemaVersion,
    model: input.request.model,
    task_type: input.request.taskType,
    manifest: input.inputManifest,
    input: input.request.input,
  });

  const run = await createRunningModelRun({
    workspaceId: input.workspaceId,
    analysisId: input.analysisId,
    researchRunId: input.researchRunId,
    sourceSnapshotId: input.sourceSnapshotId,
    taskType: input.request.taskType,
    provider: input.provider.name,
    modelName: input.request.model,
    promptVersion: input.request.promptVersion,
    schemaVersion: input.request.schemaVersion,
    inputManifest: input.inputManifest,
    inputHash,
  });

  try {
    const result = await input.provider.generateStructured(input.request);
    const completed = await completeModelRun({
      id: run.id,
      status: "completed",
      modelVersion: result.actualModel,
      providerResponseId: result.providerResponseId,
      outputHash: sha256Json(result.parsedOutput),
      inputTokens: result.inputTokens,
      cachedInputTokens: result.cachedInputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    });
    return { run: completed, parsed: result.parsedOutput };
  } catch (error) {
    const name = error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name) : "";
    const incomplete =
      error instanceof ModelIncompleteResponseError || name === "ModelIncompleteResponseError";
    const refusal = error instanceof ModelRefusalError || name === "ModelRefusalError";
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : name
            ? `${name}`
            : "Model run failed.";
    await completeModelRun({
      id: run.id,
      status: incomplete ? "incomplete" : "failed",
      errorCode: refusal ? "model_refusal" : incomplete ? "incomplete" : "provider_error",
      errorMessage: message.slice(0, 500),
    });
    throw error;
  }
}
