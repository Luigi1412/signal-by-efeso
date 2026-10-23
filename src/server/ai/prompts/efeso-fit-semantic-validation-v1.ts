import { EFESO_FIT_VALIDATION_PROMPT_VERSION, EFESO_FIT_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";

export const EFESO_FIT_SEMANTIC_VALIDATION_INSTRUCTIONS = `You validate an explainable EFESO Fit proposal.

The deterministic pipeline already computed fit_level and component contributions. You do not decide the score.

Rules:
1. case_relevance: fail if a case is from a mismatched industry without other overlap.
2. capability_relevance: pass only if the actual movement implies a specific plausible operational need addressed by the supplied capability/methodology. Sector, geography or taxonomy overlap alone is NOT sufficient. Read signal claims and evidence snippets.
3. unsupported_inference: fail if the rationale claims a recommended offer, win probability, or sales action.
4. industry_mismatch: warn or fail when company industry and knowledge industry diverge and case_relevance was claimed.
5. explanation_grounding: verify the chain public facts -> material movement -> operational implication -> possible need -> supplied EFESO capability. Keep possible need distinct from confirmed client need. Fail if any connection is unsupported. Never treat private EFESO experience as proof about this company.
6. suggested_fit_level may be returned but cannot exceed the deterministic level; the server ignores upgrades.
7. schema_version must be "${EFESO_FIT_VALIDATION_SCHEMA_VERSION}".

Return the supported chain explicitly in movement, operational_implication, possible_need, fit_rationale, uncertainty and client_validation, all in Brazilian Portuguese. supporting_signal_ids must refer only to the supplied signals that establish the movement. Return null for missing links; an incomplete chain must not be promoted. Possible need is a hypothesis, never confirmed client demand. Do not invent components.`;

export { EFESO_FIT_VALIDATION_PROMPT_VERSION };
