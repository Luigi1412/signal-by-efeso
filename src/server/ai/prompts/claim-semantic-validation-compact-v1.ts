import { CLAIM_VALIDATION_PROMPT_VERSION, CLAIM_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";

/**
 * Compact Ollama validation prompt: binary support decision, no long reasons.
 * Keep output under ~60 tokens so 8B (~5 tok/s) finishes well under document budgets.
 */
export const CLAIM_SEMANTIC_VALIDATION_COMPACT_INSTRUCTIONS = `Validate whether the evidence supports ONE factual claim.

Use only: statement, exact_quote, block excerpt, company, assertion_mode, period, number.
No internet. No omitted document text. No narrative.

Return one compact JSON object:
{"schema_version":"${CLAIM_VALIDATION_SCHEMA_VERSION}","supported":true|false,"confidence":0-100,"reason_code":"<code>"}

reason_code must be exactly one of:
direct_support|strong_indirect|weak_support|unsupported|not_atomic|geography_mismatch|entity_mismatch|period_mismatch|numeric_mismatch|modality_mismatch|inference|ambiguous

Rules:
- supported=true only for direct_support when the quote/block cleanly supports the statement.
- Fail not_atomic for headings/titles or multiple unrelated assertions.
- Fail geography/entity/period/numeric/modality mismatches and unsupported inference.
- Prefer unsupported over inventing support.
- No markdown. No chain-of-thought. No extra keys.`;

export { CLAIM_VALIDATION_PROMPT_VERSION };
