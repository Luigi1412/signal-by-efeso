import "server-only";

export {
  CLAIM_EXTRACTION_PROMPT_VERSION,
  CLAIM_EXTRACTION_SCHEMA_VERSION,
  CLAIM_VALIDATION_PROMPT_VERSION,
  CLAIM_VALIDATION_SCHEMA_VERSION,
  DETERMINISTIC_VALIDATOR_VERSION,
  SEMANTIC_VALIDATOR_VERSION,
} from "@/server/ai/versions";

export {
  TXT_PARSER_NAME,
  TXT_PARSER_VERSION,
  PDF_PARSER_NAME,
  PDF_PARSER_VERSION,
} from "@/server/parsers/constants";

export function isControlledExtractionEnabled(): boolean {
  return process.env.CONTROLLED_EXTRACTION_ENABLED === "true";
}

export function getOpenAiApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key ? key : null;
}

export function getLanguageModelProviderName(): "ollama" | "openai" | "fake" {
  const value = (process.env.LANGUAGE_MODEL_PROVIDER ?? "ollama").trim().toLowerCase();
  if (!value || value === "ollama") return "ollama";
  if (value === "openai") return "openai";
  if (value === "fake") return "fake";
  throw new Error(`LANGUAGE_MODEL_PROVIDER inválido: ${value}. Use ollama, openai ou fake.`);
}

export function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").trim().replace(/\/$/, "");
}

export function getOllamaTimeoutMs(): number {
  const raw = Number(process.env.OLLAMA_REQUEST_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 600_000;
}

export function getOllamaMaxConcurrentRequests(): number {
  const raw = Number(process.env.OLLAMA_MAX_CONCURRENT_REQUESTS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}

function ollamaModel(slot: "extraction" | "validation" | "generation"): string | null {
  const extraction = process.env.OLLAMA_EXTRACTION_MODEL?.trim() || null;
  const validation = process.env.OLLAMA_VALIDATION_MODEL?.trim() || null;
  const generation = process.env.OLLAMA_GENERATION_MODEL?.trim() || null;
  if (slot === "validation") return validation || extraction || generation;
  if (slot === "generation") return generation || extraction || validation;
  return extraction || generation || validation;
}

export function getOllamaExtractionModel(): string | null {
  return ollamaModel("extraction");
}

export function getOllamaValidationModel(): string | null {
  return ollamaModel("validation");
}

export function getOllamaGenerationModel(): string | null {
  return ollamaModel("generation");
}

export function isIntelligenceGenerationConfigured(): boolean {
  const name = getLanguageModelProviderName();
  if (name === "ollama") return Boolean(getOllamaExtractionModel());
  if (name === "openai") return Boolean(getOpenAiApiKey());
  return false;
}

export function getExtractionModel(): string {
  if (getLanguageModelProviderName() === "ollama") {
    return getOllamaExtractionModel() ?? "";
  }
  return process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-6-luna";
}

export function getValidationModel(): string {
  if (getLanguageModelProviderName() === "ollama") {
    return getOllamaValidationModel() ?? "";
  }
  return process.env.OPENAI_VALIDATION_MODEL ?? "gpt-6.1-sol";
}

export function getEscalationModel(): string {
  if (getLanguageModelProviderName() === "ollama") {
    return getOllamaGenerationModel() ?? getOllamaValidationModel() ?? "";
  }
  return process.env.OPENAI_ESCALATION_MODEL ?? "gpt-6-astra";
}

export function isEscalationEnabled(): boolean {
  return process.env.OPENAI_ESCALATION_ENABLED === "true";
}

export function getMaxExtractionBytes(): number {
  const raw = Number(process.env.CONTROLLED_EXTRACTION_MAX_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 15 * 1024 * 1024;
}

export function getMaxExtractionPages(): number {
  const raw = Number(process.env.CONTROLLED_EXTRACTION_MAX_PAGES);
  return Number.isFinite(raw) && raw > 0 ? raw : 50;
}

export { EXTRACTION_WINDOW_MAX_CHARS, EXTRACTION_WINDOW_OVERLAP_BLOCKS } from "@/server/parsers/constants";
