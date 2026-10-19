import "server-only";
import { z } from "zod";
import {
  getLanguageModelProviderName,
  getOllamaBaseUrl,
  getOllamaExtractionModel,
  getOpenAiApiKey,
} from "@/server/ai/config";
import { OllamaLanguageModelProvider } from "@/server/ai/providers/ollama-language-model-provider";

export interface LanguageModelHealth {
  provider: "ollama" | "openai" | "fake";
  reachable: boolean;
  modelInstalled: boolean;
  model: string | null;
  smoke?: "ok" | "failed" | "skipped";
  detail: string;
}

const pingSchema = z.object({ ok: z.literal(true) });

export async function checkLanguageModelProviderHealth(input?: {
  includeSmoke?: boolean;
}): Promise<LanguageModelHealth> {
  const provider = getLanguageModelProviderName();
  if (provider === "openai") {
    const key = Boolean(getOpenAiApiKey());
    return {
      provider,
      reachable: key,
      modelInstalled: key,
      model: process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-6-luna",
      smoke: "skipped",
      detail: key ? "OpenAI key present — optional provider" : "OpenAI key absent",
    };
  }
  if (provider === "fake") {
    return {
      provider,
      reachable: false,
      modelInstalled: false,
      model: null,
      smoke: "skipped",
      detail: "Fake provider is tests/admin only",
    };
  }

  const model = getOllamaExtractionModel();
  const baseUrl = getOllamaBaseUrl();
  let reachable = false;
  let installed = false;
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { method: "GET", signal: AbortSignal.timeout(3000) });
    reachable = response.ok;
    if (reachable) {
      const payload = (await response.json()) as { models?: Array<{ name?: string; model?: string }> };
      const names = (payload.models ?? []).flatMap((row) => [row.name, row.model].filter(Boolean) as string[]);
      installed = Boolean(model && names.some((name) => name === model || name.startsWith(`${model}:`) || name.split(":")[0] === model.split(":")[0]));
    }
  } catch {
    reachable = false;
  }

  const health: LanguageModelHealth = {
    provider,
    reachable,
    modelInstalled: installed,
    model,
    smoke: "skipped",
    detail: !reachable
      ? "Ollama não está acessível em 127.0.0.1:11434"
      : !model
        ? "OLLAMA_EXTRACTION_MODEL não configurado"
        : !installed
          ? `Modelo ${model} não encontrado no Ollama`
          : `Ollama acessível · modelo ${model}`,
  };

  if (!input?.includeSmoke || !reachable || !installed || !model) return health;

  try {
    const ollama = new OllamaLanguageModelProvider({ timeoutMs: 20_000 });
    const result = await ollama.generateStructured({
      taskType: "claim_extraction",
      model,
      reasoningEffort: "low",
      promptVersion: "health",
      schemaVersion: "health",
      schema: pingSchema,
      schemaName: "ollama_health",
      instructions: "Return JSON {\"ok\": true}.",
      input: "ping",
    });
    health.smoke = result.parsedOutput.ok === true ? "ok" : "failed";
    if (health.smoke === "ok") health.detail = `${health.detail} · smoke estruturado ok`;
  } catch {
    health.smoke = "failed";
    health.detail = `${health.detail} · smoke estruturado falhou`;
  }
  return health;
}
