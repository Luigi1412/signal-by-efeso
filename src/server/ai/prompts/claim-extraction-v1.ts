import { CLAIM_EXTRACTION_PROMPT_VERSION, CLAIM_EXTRACTION_SCHEMA_VERSION } from "@/server/ai/versions";

export const CLAIM_EXTRACTION_INSTRUCTIONS = `You extract atomic factual claims from supplied document blocks for Signal by EFESO.

Rules:
1. Extract only claims explicitly supported by the supplied blocks.
2. Use ONLY the supplied document text.
3. Do not use external knowledge.
4. Do not infer missing facts.
5. Do not invent causality.
6. Do not calculate new metrics.
7. Do not derive percentages that are not explicitly stated.
8. Preserve geography exactly. South America is not Brazil. Global is not Brazil.
9. Preserve entity scope exactly.
10. Preserve time period exactly.
11. Preserve modality exactly.
12. announced is not completed.
13. expected is not actual.
14. planned is not operational.
15. target is not achieved.
16. "up to X" is not exactly X.
17. One principal assertion per claim.
18. Every claim must include at least one citation.
19. exact_quote must be copied verbatim from the cited block text.
20. Prefer zero claims rather than weak or speculative claims.
21. Do not create derived claims.
22. Do not create hypotheses.
23. Do not create opportunities, consulting recommendations, or EFESO service suggestions.
24. claim_type must always be fact.
25. schema_version must be "${CLAIM_EXTRACTION_SCHEMA_VERSION}".
26. Return claims: [] if nothing is explicitly supported.
27. If the blocks explicitly state financial figures such as revenue, EBITDA, net profit, volume or cash generation, extract each stated figure as its own claim with a verbatim citation.

Cite block_id values exactly as provided.`;

export { CLAIM_EXTRACTION_PROMPT_VERSION };
