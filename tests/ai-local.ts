/**
 * Live local Ollama smoke. Does not call OpenAI.
 * Requires LANGUAGE_MODEL_PROVIDER=ollama and a running Ollama server.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import {
  CLAIM_EXTRACTION_PROMPT_VERSION,
  CLAIM_EXTRACTION_SCHEMA_VERSION,
  CLAIM_VALIDATION_PROMPT_VERSION,
  CLAIM_VALIDATION_SCHEMA_VERSION,
} from "../src/server/ai/versions";
import { CLAIM_EXTRACTION_INSTRUCTIONS } from "../src/server/ai/prompts/claim-extraction-v1";
import { CLAIM_SEMANTIC_VALIDATION_INSTRUCTIONS } from "../src/server/ai/prompts/claim-semantic-validation-v1";
import { claimExtractionOutputSchema } from "../src/server/ai/schemas/claim-extraction-schema";
import { claimValidationOutputSchema } from "../src/server/ai/schemas/claim-validation-schema";
import { OllamaLanguageModelProvider } from "../src/server/ai/providers/ollama-language-model-provider";
import { extractedClaimToDraft } from "../src/server/extraction/extraction-input";
import { runDeterministicValidators } from "../src/server/extraction/deterministic-validators";
import { decideCandidateStatus } from "../src/server/extraction/promotion-policy";
import { semanticOutputToRecords } from "../src/server/extraction/semantic-validators";

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const pingSchema = z.object({ ok: z.literal(true) });

async function main(): Promise<void> {
  const providerName = (process.env.LANGUAGE_MODEL_PROVIDER ?? "ollama").trim().toLowerCase();
  if (providerName !== "ollama") {
    console.error(`LANGUAGE_MODEL_PROVIDER=${providerName} (expected ollama).`);
    process.exit(2);
  }
  const model =
    process.env.OLLAMA_EXTRACTION_MODEL?.trim() ||
    process.env.OLLAMA_GENERATION_MODEL?.trim() ||
    process.env.OLLAMA_VALIDATION_MODEL?.trim();
  if (!model) {
    console.error("OLLAMA_EXTRACTION_MODEL is not configured.");
    process.exit(2);
  }
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(/\/$/, "");
  const tags = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
  if (!tags.ok) throw new Error("Ollama server is not reachable.");
  const listed = (await tags.json()) as { models?: Array<{ name?: string }> };
  const names = (listed.models ?? []).map((row) => row.name ?? "");
  if (!names.some((name) => name === model || name.startsWith(`${model}`))) {
    throw new Error(`Configured model ${model} is not installed.`);
  }

  const openaiHits: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("openai") || url.includes("api.openai.com")) openaiHits.push(url);
    return fetch(input, init);
  };
  const provider = new OllamaLanguageModelProvider({ model, baseUrl, fetchImpl });
  const ping = await provider.generateStructured({
    taskType: "claim_extraction",
    model,
    reasoningEffort: "low",
    promptVersion: "local-health",
    schemaVersion: "local-health",
    schema: pingSchema,
    schemaName: "ping",
    instructions: 'Return JSON {"ok": true}.',
    input: "health check",
  });
  pingSchema.parse(ping.parsedOutput);

  const fixture = readFileSync(resolve(process.cwd(), "tests/fixtures/synthetic-good.txt"), "utf8");
  const blockId = "00000000-0000-4000-8000-000000000001";
  const extraction = await provider.generateStructured({
    taskType: "claim_extraction",
    model,
    reasoningEffort: "low",
    promptVersion: CLAIM_EXTRACTION_PROMPT_VERSION,
    schemaVersion: CLAIM_EXTRACTION_SCHEMA_VERSION,
    schema: claimExtractionOutputSchema,
    schemaName: "claim_extraction",
    instructions: CLAIM_EXTRACTION_INSTRUCTIONS,
    input: JSON.stringify({
      blocks: [{ block_id: blockId, block_index: 0, page_number: 1, text: fixture }],
    }),
  });
  claimExtractionOutputSchema.parse(extraction.parsedOutput);
  if (extraction.parsedOutput.claims.length === 0) {
    throw new Error("Extraction fixture returned zero claims after Zod revalidation.");
  }
  if (extraction.parsedOutput.claims.length === 0) {
    throw new Error("Extraction fixture returned zero claims after Zod revalidation.");
  }
  if (extraction.parsedOutput.claims.length === 0) {
    throw new Error("Extraction fixture returned zero claims after Zod revalidation.");
  }
  if (extraction.parsedOutput.claims.length === 0) {
    throw new Error("Extraction fixture returned zero claims after Zod revalidation.");
  }

  const claim = extraction.parsedOutput.claims[0];
  const quote = "The company announced an investment of R$500 million in its Brazilian manufacturing operation.";
  const statement = claim?.statement ?? quote;
  const exactQuote = claim?.citations[0]?.exact_quote ?? quote;

  const validation = await provider.generateStructured({
    taskType: "claim_semantic_validation",
    model: process.env.OLLAMA_VALIDATION_MODEL?.trim() || model,
    reasoningEffort: "medium",
    promptVersion: CLAIM_VALIDATION_PROMPT_VERSION,
    schemaVersion: CLAIM_VALIDATION_SCHEMA_VERSION,
    schema: claimValidationOutputSchema,
    schemaName: "claim_semantic_validation",
    instructions: CLAIM_SEMANTIC_VALIDATION_INSTRUCTIONS,
    input: JSON.stringify({
      candidate: {
        statement,
        claim_category: claim?.claim_category ?? "investment",
        claim_type: "fact",
        assertion_mode: claim?.assertion_mode ?? "announced",
        geography: claim?.geography ?? { level: "country", country_code: "BR", state_region: null, city: null },
        citations: [{ block_id: blockId, exact_quote: exactQuote }],
      },
      cited_blocks: [{ block_id: blockId, text: fixture }],
    }),
  });
  claimValidationOutputSchema.parse(validation.parsedOutput);

  if (extraction.provider !== "ollama" || validation.provider !== "ollama") {
    throw new Error("Local test used a non-Ollama provider.");
  }
  if (openaiHits.length > 0) {
    throw new Error("Ollama mode issued an OpenAI HTTP call.");
  }

  const claimForDraft = extraction.parsedOutput.claims[0] ?? null;
  let promotionStatus: string | null = null;
  if (claimForDraft) {
    const draft = extractedClaimToDraft(claimForDraft);
    const deterministic = runDeterministicValidators({
      draft,
      blocksById: new Map([
        [
          blockId,
          {
            id: blockId,
            textContent: fixture,
            pageNumber: 1,
            sectionTitle: null,
            sourceSnapshotId: "local-smoke",
          },
        ],
      ]),
    });
    const semantic = semanticOutputToRecords(validation.parsedOutput, "local-smoke");
    promotionStatus = decideCandidateStatus({
      claimType: draft.claimType,
      hasSupportingCitation: draft.citations.length > 0,
      validations: [...deterministic, ...semantic],
    }).status;
  }

  console.log("LOCAL AI TEST: PASSED");
  console.log(
    JSON.stringify(
      {
        ok: true,
        provider: "ollama",
        model,
        ping: ping.parsedOutput,
        extractedClaimCount: extraction.parsedOutput.claims.length,
        extractionLatencyMs: extraction.latencyMs,
        extractionInputTokens: extraction.inputTokens,
        extractionOutputTokens: extraction.outputTokens,
        validationLatencyMs: validation.latencyMs,
        grounding: validation.parsedOutput.validators.grounding,
        promotionDecision: promotionStatus,
        calledOpenAI: false,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Local AI test failed.";
  console.error(`LOCAL AI TEST: NOT PASSED — ${message}`);
  process.exit(1);
});
