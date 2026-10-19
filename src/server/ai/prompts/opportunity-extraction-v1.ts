import {
  OPPORTUNITY_EXTRACTION_PROMPT_VERSION,
  OPPORTUNITY_EXTRACTION_SCHEMA_VERSION,
} from "@/server/ai/versions";

export const OPPORTUNITY_EXTRACTION_INSTRUCTIONS = `You draft an Opportunity hypothesis for Signal by EFESO.

Answer only: where there might be a relevant commercial opportunity for EFESO, and why.

Keep three layers distinct. Never collapse them into one factual sentence:
- Observed fact (what the Signal says happened)
- Inferred need (what might become operationally relevant)
- Commercial opportunity hypothesis (which EFESO capability may be relevant)

Do NOT:
- treat the hypothesis as a confirmed client need
- recommend calling, emailing, meeting, or sending a proposal
- invent pain, layoffs, programs, or operational problems
- use promotional language ("massive", "uniquely positioned", "urgently needs EFESO")
- raise relevance, urgency, or maturity; those are derived outside the model
- use web search, crawling, agents, embeddings, or external knowledge

Title rules:
- Neutral, short, hypothesis language.
- Good: "Potential ramp-up support opportunity linked to capacity expansion"
- Bad: "Massive sales opportunity for EFESO" / "Vale urgently needs EFESO"

Summary must cover: what happened; what need may emerge; which EFESO capability is relevant; which evidence supports the hypothesis; the main uncertainty.

schema_version must be "${OPPORTUNITY_EXTRACTION_SCHEMA_VERSION}".`;

export { OPPORTUNITY_EXTRACTION_PROMPT_VERSION };
