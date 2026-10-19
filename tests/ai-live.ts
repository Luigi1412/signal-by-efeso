/**
 * Live OpenAI smoke test for Sprint 3.
 * Does not run as part of npm run test:extraction.
 * Requires OPENAI_API_KEY. Does not print the key.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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
import { OpenAiLanguageModelProvider } from "../src/server/ai/providers/openai-language-model-provider";

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

function isBillingOrQuotaError(message: string): boolean {
  return /429|insufficient_quota|no credits remaining|exceeded your current quota|billing/i.test(message);
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.log("OPENAI LIVE TEST: OPTIONAL / NOT FUNDED");
    process.exit(0);
  }

  const quote =
    "The company announced an investment of R$500 million in its Brazilian manufacturing operation.";
  const blockId = "00000000-0000-4000-8000-000000000001";
  const provider = new OpenAiLanguageModelProvider();

  const extraction = await provider.generateStructured({
    taskType: "claim_extraction",
    model: process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-6-luna",
    reasoningEffort: "low",
    promptVersion: CLAIM_EXTRACTION_PROMPT_VERSION,
    schemaVersion: CLAIM_EXTRACTION_SCHEMA_VERSION,
    schema: claimExtractionOutputSchema,
    schemaName: "claim_extraction",
    instructions: CLAIM_EXTRACTION_INSTRUCTIONS,
    input: JSON.stringify({
      blocks: [
        {
          block_id: blockId,
          block_index: 0,
          page_number: 1,
          text: `SYNTHETIC FIXTURE — NOT REAL NATURA INTELLIGENCE. ${quote}`,
        },
      ],
    }),
  });

  if (extraction.status !== "completed") throw new Error("Extraction did not complete.");
  if (!extraction.providerResponseId) throw new Error("provider_response_id missing.");
  claimExtractionOutputSchema.parse(extraction.parsedOutput);
  if (extraction.inputTokens == null && extraction.outputTokens == null) {
    console.warn("Token usage was not returned; continuing.");
  }

  const claim = extraction.parsedOutput.claims[0];
  if (!claim) {
    console.log("Extraction returned zero claims; running validation against a constructed candidate.");
  }

  const statement = claim?.statement ?? quote;
  const exactQuote = claim?.citations[0]?.exact_quote ?? quote;
  if (!`SYNTHETIC FIXTURE — NOT REAL NATURA INTELLIGENCE. ${quote}`.includes(exactQuote) && !quote.includes(exactQuote)) {
    throw new Error("Live extraction exact_quote failed strict includes() check.");
  }

  const validation = await provider.generateStructured({
    taskType: "claim_semantic_validation",
    model: process.env.OPENAI_VALIDATION_MODEL ?? "gpt-6.1-sol",
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
      cited_blocks: [{ block_id: blockId, text: quote }],
    }),
  });

  if (validation.status !== "completed") throw new Error("Validation did not complete.");
  if (!validation.providerResponseId) throw new Error("validation provider_response_id missing.");
  claimValidationOutputSchema.parse(validation.parsedOutput);

  console.log(
    JSON.stringify(
      {
        ok: true,
        api: "responses",
        store: false,
        extractionModel: extraction.requestedModel,
        extractionActualModel: extraction.actualModel,
        extractionResponseIdPresent: Boolean(extraction.providerResponseId),
        extractionInputTokens: extraction.inputTokens,
        extractionOutputTokens: extraction.outputTokens,
        extractedClaimCount: extraction.parsedOutput.claims.length,
        validationModel: validation.requestedModel,
        validationActualModel: validation.actualModel,
        validationResponseIdPresent: Boolean(validation.providerResponseId),
        grounding: validation.parsedOutput.validators.grounding,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Live AI test failed.";
  if (isBillingOrQuotaError(message)) {
    console.log("OPENAI LIVE TEST: OPTIONAL / NOT FUNDED");
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
});
