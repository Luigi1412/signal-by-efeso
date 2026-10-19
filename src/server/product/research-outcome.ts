/**
 * Honest executive outcomes for research / company summary (member surface).
 * Technical codes stay admin-only.
 */

export const RESEARCH_OUTCOMES = [
  "signal_found",
  "facts_only",
  "insufficient_evidence",
  "no_reliable_sources",
  "analysis_partial",
  "analysis_failed",
] as const;

export type ResearchOutcome = (typeof RESEARCH_OUTCOMES)[number];

export function deriveCompanyResearchOutcome(input: {
  signalCount: number;
  activeClaimCount: number;
  failureCode?: string | null;
  runStatus?: string | null;
  insufficientEvidenceForSignal?: boolean;
}): ResearchOutcome {
  const status = input.runStatus ?? null;
  const code = input.failureCode ?? null;

  // Hard failure only when the run itself failed. Stale failure_code on partial/completed
  // must not hide promoted signals (late enrichment infra errors finish as partial).
  if (status === "failed") {
    if (code === "NO_RELIABLE_SOURCES" || code === "SOURCE_FETCH_FAILED") return "no_reliable_sources";
    if (code === "TAVILY_AUTH_FAILED" || code === "TAVILY_TIMEOUT" || code === "LOCAL_MODEL_UNAVAILABLE") {
      return "analysis_failed";
    }
    return "analysis_failed";
  }

  if (input.signalCount > 0) return "signal_found";

  if (status === "partial") return "analysis_partial";

  if (input.activeClaimCount > 0 || input.insufficientEvidenceForSignal) {
    return "facts_only";
  }

  if (code === "NO_RELIABLE_SOURCES") return "no_reliable_sources";

  return "insufficient_evidence";
}

export function researchOutcomeMemberCopy(outcome: ResearchOutcome): {
  title: string;
  body: string;
} {
  switch (outcome) {
    case "signal_found":
      return {
        title: "Sinal identificado",
        body: "Foram identificados movimentos relevantes sustentados por evidências públicas.",
      };
    case "facts_only":
      return {
        title: "Fatos encontrados, sem evidência suficiente para um sinal",
        body: "Encontramos fatos relevantes, mas ainda não há evidência suficiente para sustentar um sinal.",
      };
    case "insufficient_evidence":
      return {
        title: "Evidência insuficiente",
        body: "As informações públicas encontradas ainda são insuficientes para uma conclusão.",
      };
    case "no_reliable_sources":
      return {
        title: "Sem fontes confiáveis",
        body: "Não encontramos fontes públicas suficientemente confiáveis para esta análise.",
      };
    case "analysis_partial":
      return {
        title: "Pesquisa parcial",
        body: "Parte da pesquisa ficou disponível. Há evidência útil, mesmo sem conclusão completa.",
      };
    case "analysis_failed":
      return {
        title: "Pesquisa incompleta",
        body: "A pesquisa não pôde ser concluída. Você pode tentar atualizar mais tarde.",
      };
  }
}

export function memberResearchStatusLabel(status: string | null | undefined, outcome?: ResearchOutcome | null): string {
  switch (status) {
    case "queued":
    case "resolving_entity":
    case "discovering_sources":
    case "reviewing_sources":
    case "ingesting_sources":
    case "extracting_claims":
    case "generating_signals":
    case "generating_intelligence":
    case "generating_opportunities":
    case "generating_actions":
      return "Pesquisa em andamento";
    case "needs_user_resolution":
      return "Confirmação necessária";
    case "completed":
      if (outcome === "facts_only") return "Fatos encontrados, sem evidência suficiente para um sinal";
      if (outcome === "insufficient_evidence") return "Evidência insuficiente";
      if (outcome === "signal_found") return "Sinal identificado";
      return "Pesquisa concluída";
    case "partial":
      return "Pesquisa parcial";
    case "failed":
      return "Falha recuperável";
    case "cancelled":
      return "Cancelada";
    default:
      return "Disponível";
  }
}

/** Compact list label for the Empresas table. */
export function memberOutcomeListLabel(outcome: ResearchOutcome | null, runStatus?: string | null): string {
  if (runStatus && !["completed", "partial", "failed", "cancelled"].includes(runStatus)) {
    return "Pesquisa em andamento";
  }
  if (!outcome) return "—";
  return researchOutcomeMemberCopy(outcome).title;
}
