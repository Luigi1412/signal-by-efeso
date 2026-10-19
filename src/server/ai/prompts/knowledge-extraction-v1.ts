import { KNOWLEDGE_EXTRACTION_PROMPT_VERSION, KNOWLEDGE_EXTRACTION_SCHEMA_VERSION } from "@/server/ai/versions";

export const KNOWLEDGE_EXTRACTION_INSTRUCTIONS = `You extract EFESO institutional knowledge objects from supplied document blocks for Signal.

Rules:
1. Extract only objects explicitly described in the supplied blocks.
2. Use ONLY the supplied document text. Do not use external knowledge.
3. Do not infer missing facts, clients, geographies, or capabilities.
4. Do not convert a specific example into a universal competence.
5. Do not attribute competitor capabilities to EFESO.
6. Do not invent job titles, authors, organizations, or identities.
7. "may be used" is not "always used".
8. "up to X" is not exactly X.
9. "expected" is not a reported actual result.
10. If a result is not explicitly attributed to EFESO, set attributed_to_efeso=false and prefer zero objects rather than claiming EFESO caused it.
11. Prefer zero objects rather than weak or speculative objects.
12. Every object must include at least one citation with exact_quote copied verbatim.
13. Map tags only to the supplied controlled taxonomy names when clearly supported.
14. schema_version must be "${KNOWLEDGE_EXTRACTION_SCHEMA_VERSION}".
15. Return objects: [] if nothing is explicitly supported.
16. Do not recommend commercial pitches or opportunities.

Cite block_id values exactly as provided.`;

export { KNOWLEDGE_EXTRACTION_PROMPT_VERSION };
