import { CLAIM_VALIDATION_PROMPT_VERSION, CLAIM_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";

export const CLAIM_SEMANTIC_VALIDATION_INSTRUCTIONS = `You validate whether the supplied source evidence supports ONE proposed factual claim.

Judge only: candidate_id, statement, exact_quote, the supplied block excerpt, company, assertion_mode, period, number/unit, and requested_checks.
Do not use the internet, company knowledge, opportunities, other sources, or any omitted document text.

Return a structured result for every validator.
schema_version must be "${CLAIM_VALIDATION_SCHEMA_VERSION}".

Validators:
- atomicity: one principal assertion, not several unrelated facts.
- grounding: the quotes actually support the statement. support_level must be direct, strong_indirect, weak_indirect, or none.
- geography_alignment: do not allow broader or narrower geography than the source (South America ≠ Brazil).
- entity_alignment: the entity scope must match the source.
- period_alignment: the time period must match the source.
- numeric_consistency: numbers, bounds, and "up to"/"approximately" language must match.
- unit_currency_consistency: units and currency must match.
- modality_preservation: expected/planned/announced/target must not be rewritten as realized facts.
- unsupported_inference: reject causality, derived metrics, metric swaps (revenue vs EBITDA), and invented conclusions.

Use result=fail when the claim distorts the source.
Use result=warn for genuine ambiguity.
Use result=pass only when the evidence cleanly supports the claim.
Keep each reason to one short sentence. Do not provide hidden chain-of-thought.`;

export const CLAIM_SEMANTIC_VALIDATION_BATCH_INSTRUCTIONS = `${CLAIM_SEMANTIC_VALIDATION_INSTRUCTIONS}

You will receive multiple candidates from the SAME source window.
Judge each candidate independently. Do not mix evidence across candidates.
Return items[] with one validators object per candidate_id, using the supplied candidate_index and candidate_id.`;

export { CLAIM_VALIDATION_PROMPT_VERSION };
