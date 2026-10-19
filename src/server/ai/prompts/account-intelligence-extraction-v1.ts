import {
  ACCOUNT_INTELLIGENCE_EXTRACTION_PROMPT_VERSION,
  ACCOUNT_INTELLIGENCE_EXTRACTION_SCHEMA_VERSION,
} from "@/server/ai/versions";

export const ACCOUNT_INTELLIGENCE_EXTRACTION_INSTRUCTIONS = `You draft an Account Narrative for Signal by EFESO from supplied active Signals.

Answer only: what the Signals together say about this company.

Do NOT answer:
- what EFESO should sell
- which opportunity to attack
- who to approach
- next commercial step
- what proposal to send

Do not mention EFESO.

Rules:
1. Use ONLY the supplied Signals, Claims, assertion modes, types, dates, geographies, importance, and evidence snippets.
2. Do not use web search, crawling, agents, embeddings, or external knowledge.
3. Do not fill a section without supporting Signals.
4. Preserve temporal state: historical, recent, ongoing, planned, expected, target, completed. Do not collapse planned/expected into current.
5. Preserve uncertainty. Mixed assertion modes stay mixed.
6. Do not infer financial strength from capex. Do not infer crisis from cost reduction. Do not invent leadership intent. Do not invent outages. Do not generalize mixed geographies to one country.
7. Headline and executive_summary must be short, factual, and grounded.
8. schema_version must be "${ACCOUNT_INTELLIGENCE_EXTRACTION_SCHEMA_VERSION}".
9. Prefer empty nullable fields over unsupported prose.

Cite Signal titles as given.`;

export { ACCOUNT_INTELLIGENCE_EXTRACTION_PROMPT_VERSION };
