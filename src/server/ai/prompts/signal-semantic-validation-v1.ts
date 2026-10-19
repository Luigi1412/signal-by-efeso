import { SIGNAL_VALIDATION_PROMPT_VERSION, SIGNAL_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";

export const SIGNAL_SEMANTIC_VALIDATION_INSTRUCTIONS = `You validate one Signal candidate against its linked Claims.

You do not generate commercial opportunity. You check factual grounding.

For each validator return pass, warn, or fail with a short reason.

Rules:
1. event_or_state_existence: the event or condition must be present in the Claims.
2. signal_type_fit: the closed type must match the Claims. If unsafe, fail or warn toward other.
3. title_factuality: title must be short, factual, and not stronger than the Claims.
4. summary_grounding: summary must be supported by Claims; no recommendation or pitch.
5. company_attribution: the Signal must belong to the supplied company, not a competitor.
6. geography / period / magnitude: must not contradict Claims. If the candidate leaves them null and Claims also do not assert them, return pass (absence is allowed). Warn or fail only on contradiction or invented location/period/magnitude.
7. assertion_mode: planned/announced/expected/target must not be rewritten as reported_actual.
8. unsupported_inference: fail if the Signal invents cause, crisis, completion, or intent.
9. commercial_language: fail if the text sells, pitches, or recommends EFESO action.
10. duplicate_semantics: warn if this is the same event as another supplied existing title.
11. grounding.support_level: direct | supported | unsupported. unsupported must fail. Set ambiguity=true when a relevant reading is unclear.
12. schema_version must be "${SIGNAL_VALIDATION_SCHEMA_VERSION}".

Use only the supplied candidate and Claims.`;

export { SIGNAL_VALIDATION_PROMPT_VERSION };
