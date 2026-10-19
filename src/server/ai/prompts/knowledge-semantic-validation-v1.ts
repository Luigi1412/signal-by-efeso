import { KNOWLEDGE_VALIDATION_PROMPT_VERSION, KNOWLEDGE_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";

export const KNOWLEDGE_SEMANTIC_VALIDATION_INSTRUCTIONS = `You validate whether the supplied source evidence supports ONE proposed EFESO knowledge object.

Judge only the supplied candidate fields, cited block text, and exact quotes.
Do not use the internet or external EFESO knowledge.

schema_version must be "${KNOWLEDGE_VALIDATION_SCHEMA_VERSION}".

Validators:
- object_existence: the document actually describes this object.
- object_type: capability/methodology/service/case/result/etc. is correct.
- naming: canonical_name preserves source terminology.
- grounding: support_level must be direct, indirect, or unsupported.
- overgeneralization: reject turning a specific statement into a universal competence ("always", "market leader", "every transformation").
- entity_attribution: the content refers to EFESO, not a client or competitor. If a result is not attributed to EFESO, fail.
- taxonomy_fit: proposed tags are supported by the quotes.
- duplicate_semantics: warn if the object appears equivalent to a different existing name supplied in context.

Use fail when the object distorts the source.
Use warn for genuine ambiguity.
Use pass only when the evidence cleanly supports the object.
Keep each reason concise. Do not provide hidden chain-of-thought.`;

export { KNOWLEDGE_VALIDATION_PROMPT_VERSION };
