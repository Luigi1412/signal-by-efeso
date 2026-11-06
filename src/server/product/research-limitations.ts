import type { ResearchOutcome } from "./research-outcome";

export interface ResearchLimitationView {
  id: string;
  text: string;
  severity: "high" | "medium" | "low";
  kind: "company" | "hypothesis" | "research_limitation";
}

/**
 * Report "O que faltou" copy derived from pipeline state.
 * `primarySourceCount` = retained source_quality=primary documents.
 * `citedPrimarySourceCount` = distinct primaries cited by qualified claims.
 */
export function buildResearchLimitations(input: {
  outcome: ResearchOutcome;
  outcomeBody: string;
  sourceCount: number;
  primarySourceCount: number;
  citedPrimarySourceCount: number;
  noSupportedOpportunity: boolean;
  opportunityCount: number;
  validatedFactCount: number;
}): ResearchLimitationView[] {
  const items: ResearchLimitationView[] = [];
  if (
    input.outcome === "insufficient_evidence" ||
    input.outcome === "facts_only" ||
    input.outcome === "research_coverage_insufficient"
  ) {
    items.push({ id: "outcome-gap", text: input.outcomeBody, severity: "high", kind: "research_limitation" });
  }
  if (input.primarySourceCount === 0) {
    items.push({
      id: "no-primary",
      text: "Nenhuma fonte primária/oficial densa foi retida nesta execução.",
      severity: "high",
      kind: "research_limitation",
    });
  } else if (input.citedPrimarySourceCount === 0) {
    items.push({
      id: "no-cited-primary",
      text: "Fontes primárias foram retidas, mas nenhum fato material validado citou origem primária nesta execução.",
      severity: "high",
      kind: "research_limitation",
    });
  }
  if (input.sourceCount > 0 && input.sourceCount < 4) {
    items.push({
      id: "thin-sources",
      text: `Base documental estreita (${input.sourceCount} fonte(s) retida(s)).`,
      severity: "medium",
      kind: "research_limitation",
    });
  }
  if (input.noSupportedOpportunity || input.opportunityCount === 0) {
    items.push({
      id: "no-opp",
      text: "Nenhuma oportunidade EFESO foi promovida a partir das evidências atuais.",
      severity: "medium",
      kind: "research_limitation",
    });
  }
  if (input.validatedFactCount <= 1) {
    items.push({
      id: "thin-facts",
      text: "Poucos fatos materiais validados — insuficiente para leitura comercial plena.",
      severity: "medium",
      kind: "research_limitation",
    });
  }
  return items.slice(0, 6);
}
