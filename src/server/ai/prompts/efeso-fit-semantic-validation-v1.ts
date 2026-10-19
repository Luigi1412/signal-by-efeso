import { EFESO_FIT_VALIDATION_PROMPT_VERSION, EFESO_FIT_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";

export const EFESO_FIT_SEMANTIC_VALIDATION_INSTRUCTIONS = `You validate an explainable EFESO Fit proposal.

The deterministic pipeline already computed fit_level and component contributions. You do not decide the score.

Rules:
1. case_relevance: fail if a case is from a mismatched industry without other overlap.
2. capability_relevance: pass only if supplied Signals or themes actually relate to the knowledge object tags.
3. unsupported_inference: fail if the rationale claims a recommended offer, win probability, or sales action.
4. industry_mismatch: warn or fail when company industry and knowledge industry diverge and case_relevance was claimed.
5. explanation_grounding: rationale must only restate supplied components.
6. suggested_fit_level may be returned but cannot exceed the deterministic level; the server ignores upgrades.
7. schema_version must be "${EFESO_FIT_VALIDATION_SCHEMA_VERSION}".

Do not invent components.`;

export { EFESO_FIT_VALIDATION_PROMPT_VERSION };
