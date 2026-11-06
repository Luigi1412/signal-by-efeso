import { CLAIM_EXTRACTION_PROMPT_VERSION, CLAIM_EXTRACTION_SCHEMA_VERSION } from "@/server/ai/versions";

export const CLAIM_EXTRACTION_INSTRUCTIONS = `Extract atomic factual claims from the supplied document blocks for Signal by EFESO.

Grounding:
- Use ONLY the supplied block text. No external knowledge, inference, causality, derived math, or invented facts.
- Prefer claims: [] over weak/speculative claims. Max 2 claims. Strongest quantitative/material facts only.
- One principal assertion per claim. claim_type must be "fact".
- Every claim needs ≥1 citation; exact_quote must be copied verbatim from the cited block; cite block_id exactly.
- Preserve geography, entity scope, time, modality exactly (announced≠completed, expected≠actual, planned≠operational, target≠achieved, "up to X"≠exactly X).
- South America is not Brazil. Global is not Brazil.
- entity_relationship: company|parent|subsidiary|brand|unresolved as explicitly stated.
- Reject ambiguous earnings unless the source names net income, operating profit, EBITDA or EPS.
- Normalize statement/operational_theme to Brazilian Portuguese; keep exact_quote in original language.
- schema_version must be "${CLAIM_EXTRACTION_SCHEMA_VERSION}".
Return a single compact JSON object only. No markdown, no narrative, no chain-of-thought.`;

/**
 * Local 8B: tiny flat shape so 1 strong claim closes inside ≤150 output tokens.
 * Do NOT list enums with "|" — the model copies the whole pipe string into the field.
 */
export const CLAIM_EXTRACTION_COMPACT_INSTRUCTIONS = `Extract at most 1 atomic factual claim from the blocks for Signal by EFESO.

Rules:
- Use ONLY supplied block text. Prefer {"claims":[]} over weak claims.
- Never copy example placeholders. statement and exact_quote must come from the blocks.
- HARD LIMITS: statement ≤90 characters; exact_quote ≤90 characters. Cut the quote at a word boundary if needed.
- statement must be a full PT-BR sentence (≥25 chars) naming the metric/event — never a bare number like "88.242".
- If you cannot finish a closed JSON object under these limits, return {"schema_version":"${CLAIM_EXTRACTION_SCHEMA_VERSION}","claims":[]}.
- claim_category must be exactly one token: financial, strategy, manufacturing, capacity, headcount, investment, supply_chain, procurement, leadership, regulatory, sustainability, market, or other.
- assertion_mode must be exactly one token: reported_actual, announced, planned, expected, target, estimated, conditional, or unspecified.
- Omit every null/empty key. No markdown. Stop right after the final }.
- schema_version must be "${CLAIM_EXTRACTION_SCHEMA_VERSION}".
Return ONLY:
{"schema_version":"${CLAIM_EXTRACTION_SCHEMA_VERSION}","claims":[{"statement":"<PT-BR ≤90>","claim_category":"financial","assertion_mode":"reported_actual","block_id":"<uuid>","exact_quote":"<verbatim ≤90>"}]}`;

export { CLAIM_EXTRACTION_PROMPT_VERSION };
