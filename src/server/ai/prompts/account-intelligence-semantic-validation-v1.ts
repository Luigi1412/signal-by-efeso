import {
  ACCOUNT_INTELLIGENCE_VALIDATION_PROMPT_VERSION,
  ACCOUNT_INTELLIGENCE_VALIDATION_SCHEMA_VERSION,
} from "@/server/ai/versions";

export const ACCOUNT_INTELLIGENCE_SEMANTIC_VALIDATION_INSTRUCTIONS = `You validate one Account Intelligence narrative against its linked active Signals.

You do not generate commercial opportunity. You check grounding.

For each validator return pass, warn, or fail with a short reason.

Rules:
1. summary_grounding: executive summary must be supported by Signals; no recommendation.
2. strategic_priority_grounding: strategic text must map to supporting Signals.
3. pressure_grounding: pressure text must map to supporting Signals.
4. risk_grounding: risk text must map to supporting Signals.
5. theme_grounding: mentioned themes must exist in supplied recurring themes.
6. unsupported_inference: fail if the narrative invents strength, crisis, completion, outage, or intent.
7. causal_overreach: fail if the narrative claims one Signal causes another without evidence.
8. temporal_accuracy: planned/expected/target must not be written as completed or current.
9. contradiction_handling: tensions may be noted; do not resolve them into a prediction (e.g. investment will fail).
10. schema_version must be "${ACCOUNT_INTELLIGENCE_VALIDATION_SCHEMA_VERSION}".

Use only the supplied narrative, Signals, themes, and tensions.`;

export { ACCOUNT_INTELLIGENCE_VALIDATION_PROMPT_VERSION };
