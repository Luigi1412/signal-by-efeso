import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import {
  ModelIncompleteResponseError,
  ModelProviderUnavailableError,
  ModelRefusalError,
} from "@/server/ai/errors";
import type {
  LanguageModelProvider,
  StructuredGenerationRequest,
  StructuredGenerationSuccess,
} from "@/server/ai/language-model-provider";

const MAX_RETRIES = 2;
const RETRY_BASE_MS = 400;

function isRetryableStatus(status: number | undefined): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class OpenAiLanguageModelProvider implements LanguageModelProvider {
  readonly name = "openai";

  async generateStructured<T extends z.ZodType>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationSuccess<z.infer<T>>> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new ModelProviderUnavailableError("OPENAI_API_KEY is not configured.");

    const client = new OpenAI({ apiKey });
    const started = Date.now();
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await client.responses.parse({
          model: request.model,
          store: false,
          reasoning: { effort: request.reasoningEffort },
          instructions: request.instructions,
          input: request.input,
          text: { format: zodTextFormat(request.schema, request.schemaName) },
        });

        const latencyMs = Date.now() - started;
        const refusal =
          "refusal" in response && typeof response.refusal === "string" && response.refusal
            ? response.refusal
            : null;

        if (response.status === "incomplete" || response.incomplete_details) {
          throw new ModelIncompleteResponseError(response.incomplete_details?.reason ?? "incomplete");
        }
        if (refusal) throw new ModelRefusalError(String(refusal));
        if (response.status === "failed") {
          throw new ModelProviderUnavailableError("OpenAI response status=failed");
        }

        const parsed = request.schema.parse(response.output_parsed);
        const usage = response.usage;

        return {
          status: "completed",
          parsedOutput: parsed,
          provider: this.name,
          requestedModel: request.model,
          actualModel: response.model ?? null,
          providerResponseId: response.id ?? null,
          inputTokens: usage?.input_tokens ?? null,
          cachedInputTokens: usage?.input_tokens_details?.cached_tokens ?? null,
          outputTokens: usage?.output_tokens ?? null,
          latencyMs,
          refusal: null,
          incompleteReason: null,
        };
      } catch (error) {
        lastError = error;
        if (error instanceof ModelRefusalError || error instanceof ModelIncompleteResponseError) {
          throw error;
        }
        const status = (error as { status?: number }).status;
        const retryable = isRetryableStatus(status) || (error instanceof TypeError && /fetch|network/i.test(String(error)));
        if (!retryable || attempt === MAX_RETRIES) {
          if (error instanceof ModelProviderUnavailableError) throw error;
          throw new ModelProviderUnavailableError(error instanceof Error ? error.message : "OpenAI request failed.");
        }
        await sleep(RETRY_BASE_MS * (attempt + 1));
      }
    }

    throw new ModelProviderUnavailableError(lastError instanceof Error ? lastError.message : "OpenAI request failed.");
  }
}
