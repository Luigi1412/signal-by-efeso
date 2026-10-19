import type { z } from "zod";
import {
  ModelIncompleteResponseError,
  ModelRefusalError,
} from "@/server/ai/errors";
import type {
  LanguageModelProvider,
  ModelTaskType,
  StructuredGenerationRequest,
  StructuredGenerationSuccess,
} from "@/server/ai/language-model-provider";

export type FakeProviderQueueItem =
  | { kind: "output"; taskType?: ModelTaskType; output: unknown }
  | { kind: "refusal"; message?: string }
  | { kind: "incomplete"; reason?: string }
  | { kind: "error"; message?: string };

export class FakeLanguageModelProvider implements LanguageModelProvider {
  readonly name = "fake";
  private readonly queue: FakeProviderQueueItem[];

  constructor(queue: FakeProviderQueueItem[] = []) {
    this.queue = [...queue];
  }

  enqueue(item: FakeProviderQueueItem): void {
    this.queue.push(item);
  }

  async generateStructured<T extends z.ZodType>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationSuccess<z.infer<T>>> {
    const next = this.queue.shift() ?? { kind: "output" as const, output: {} };
    if (next.kind === "refusal") throw new ModelRefusalError(next.message ?? "refused");
    if (next.kind === "incomplete") throw new ModelIncompleteResponseError(next.reason ?? "incomplete");
    if (next.kind === "error") throw new Error(next.message ?? "fake provider error");

    const parsed = request.schema.parse(next.output);
    return {
      status: "completed",
      parsedOutput: parsed,
      provider: this.name,
      requestedModel: request.model,
      actualModel: "fake-model",
      providerResponseId: `fake-${request.taskType}-${Date.now()}`,
      inputTokens: 12,
      cachedInputTokens: 0,
      outputTokens: 8,
      latencyMs: 1,
      refusal: null,
      incompleteReason: null,
    };
  }
}
