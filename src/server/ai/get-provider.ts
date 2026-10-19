import "server-only";
import { getLanguageModelProviderName, getOpenAiApiKey, getOllamaExtractionModel } from "@/server/ai/config";
import { ModelProviderUnavailableError } from "@/server/ai/errors";
import type { LanguageModelProvider } from "@/server/ai/language-model-provider";
import { OllamaLanguageModelProvider } from "@/server/ai/providers/ollama-language-model-provider";
import { OpenAiLanguageModelProvider } from "@/server/ai/providers/openai-language-model-provider";

export function getLanguageModelProvider(): LanguageModelProvider {
  const name = getLanguageModelProviderName();
  if (name === "ollama") {
    if (!getOllamaExtractionModel()) {
      throw new ModelProviderUnavailableError("OLLAMA_MODEL_NOT_CONFIGURED");
    }
    return new OllamaLanguageModelProvider();
  }
  if (name === "openai") {
    if (!getOpenAiApiKey()) {
      throw new ModelProviderUnavailableError("OPENAI_API_KEY is not configured.");
    }
    return new OpenAiLanguageModelProvider();
  }
  throw new ModelProviderUnavailableError("Fake language model provider is not available in this context.");
}
