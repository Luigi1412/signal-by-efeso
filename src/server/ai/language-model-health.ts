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

/**
 * Distinguishes hard model unavailability from a healthy model that is merely slow on a document.
 * - unavailable: tags/smoke fail
 * - healthy_slow_document: smoke ok, but a bounded extract-like call hits the deadline
 * - healthy: smoke ok and tiny call completes
 */
export type ModelOperationalState = "unavailable" | "healthy" | "healthy_slow_document";

export async function probeLocalModelOperationalState(input?: {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  model?: string;
  /** Tiny structured ping timeout. */
  smokeTimeoutMs?: number;
  /** Optional slow-document simulation: hang forever until deadline. */
  simulateSlowDocument?: boolean;
  documentDeadlineMs?: number;
}): Promise<{ state: ModelOperationalState; detail: string; smokeMs: number | null; documentMs: number | null }> {
  const baseUrl = (input?.baseUrl ?? getOllamaBaseUrl()).replace(/\/$/, "");
  const model = input?.model ?? getOllamaExtractionModel();
  const fetchImpl = input?.fetchImpl ?? fetch;
  const smokeTimeoutMs = input?.smokeTimeoutMs ?? 12_000;
  let smokeMs: number | null = null;
  try {
    const tags = await fetchImpl(`${baseUrl}/api/tags`, { method: "GET", signal: AbortSignal.timeout(3_000) });
    if (!tags.ok) return { state: "unavailable", detail: `tags_http_${tags.status}`, smokeMs: null, documentMs: null };
    const payload = (await tags.json()) as { models?: Array<{ name?: string }> };
    const names = (payload.models ?? []).map((row) => row.name).filter(Boolean) as string[];
    const installed = Boolean(
      model && names.some((name) => name === model || name.startsWith(`${model}:`) || name.split(":")[0] === model.split(":")[0]),
    );
    if (!installed) return { state: "unavailable", detail: "model_not_installed", smokeMs: null, documentMs: null };
  } catch {
    return { state: "unavailable", detail: "ollama_unreachable", smokeMs: null, documentMs: null };
  }

  const smokeStarted = performance.now();
  try {
    const ollama = new OllamaLanguageModelProvider({
      baseUrl,
      model: model ?? undefined,
      timeoutMs: smokeTimeoutMs,
      fetchImpl,
    });
    const result = await ollama.generateStructured({
      taskType: "claim_extraction",
      model: model ?? "llama3.1:8b",
      reasoningEffort: "low",
      promptVersion: "health",
      schemaVersion: "health",
      schema: pingSchema,
      schemaName: "ollama_health",
      instructions: 'Return JSON {"ok": true}.',
      input: "ping",
    });
    smokeMs = Math.round(performance.now() - smokeStarted);
    if (result.parsedOutput.ok !== true) {
      return { state: "unavailable", detail: "smoke_invalid", smokeMs, documentMs: null };
    }
  } catch {
    smokeMs = Math.round(performance.now() - smokeStarted);
    return { state: "unavailable", detail: "smoke_failed", smokeMs, documentMs: null };
  }

  if (!input?.simulateSlowDocument) {
    return { state: "healthy", detail: "smoke_ok", smokeMs, documentMs: null };
  }

  const documentDeadlineMs = input.documentDeadlineMs ?? 2_000;
  const docStarted = performance.now();
  try {
    await new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("DOCUMENT_EXTRACT_DEADLINE")), documentDeadlineMs);
      // Keep the promise pending to emulate a healthy-but-slow extract call.
      void timer;
    });
  } catch (error) {
    const documentMs = Math.round(performance.now() - docStarted);
    const message = error instanceof Error ? error.message : String(error);
    if (/DOCUMENT_EXTRACT_DEADLINE|timed out|OLLAMA_CALL_DEADLINE/i.test(message)) {
      return {
        state: "healthy_slow_document",
        detail: "smoke_ok_document_deadline",
        smokeMs,
        documentMs,
      };
    }
    return { state: "unavailable", detail: message.slice(0, 120), smokeMs, documentMs };
  }
  return { state: "healthy", detail: "smoke_ok", smokeMs, documentMs: Math.round(performance.now() - docStarted) };
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
