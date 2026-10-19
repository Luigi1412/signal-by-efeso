import type { z } from "zod";

export type ModelTaskType =
  | "claim_extraction"
  | "claim_grounding_validation"
  | "claim_semantic_validation"
  | "claim_escalation"
  | "knowledge_extraction"
  | "knowledge_validation"
  | "signal_extraction"
  | "signal_validation"
  | "account_intelligence_generation"
  | "account_intelligence_validation"
  | "efeso_fit_generation"
  | "efeso_fit_validation"
  | "opportunity_generation"
  | "opportunity_validation"
  | "relationship_action_generation"
  | "relationship_action_validation";

export type ReasoningEffort = "low" | "medium" | "high";

export interface StructuredGenerationRequest<T extends z.ZodType> {
  taskType: ModelTaskType;
  model: string;
  reasoningEffort: ReasoningEffort;
  promptVersion: string;
  schemaVersion: string;
  schema: T;
  schemaName: string;
  instructions: string;
  input: string;
}

export interface StructuredGenerationSuccess<T> {
  status: "completed";
  parsedOutput: T;
  provider: string;
  requestedModel: string;
  actualModel: string | null;
  providerResponseId: string | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  refusal: string | null;
  incompleteReason: string | null;
}

export interface LanguageModelProvider {
  readonly name: string;
  generateStructured<T extends z.ZodType>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationSuccess<z.infer<T>>>;
}
