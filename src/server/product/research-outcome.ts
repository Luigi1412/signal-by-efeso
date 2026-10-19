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

  if (status === "failed" || code === "PIPELINE_VALIDATION_FAILED") {
    if (code === "NO_RELIABLE_SOURCES" || code === "SOURCE_FETCH_FAILED") return "no_reliable_sources";
    if (code === "TAVILY_AUTH_FAILED" || code === "TAVILY_TIMEOUT" || code === "LOCAL_MODEL_UNAVAILABLE") {
      return "analysis_failed";
    }
    return "analysis_failed";
  }

  if (status === "partial") return "analysis_partial";

  if (input.signalCount > 0) return "signal_found";

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
        title: "Movimento identificado",
        body: "Há pelo menos um movimento empresarial suficientemente sustentado pelas evidências disponíveis.",
      };
    case "facts_only":
      return {
        title: "Fatos validados, sem sinal",
        body: "Informações públicas foram validadas, mas não há um movimento empresarial suficientemente sustentado para gerar um sinal.",
      };
    case "insufficient_evidence":
      return {
        title: "Evidência insuficiente",
        body: "As fontes disponíveis não sustentam um sinal empresarial neste momento.",
      };
    case "no_reliable_sources":
      return {
        title: "Sem fontes confiáveis",
        body: "Não encontramos fontes públicas suficientemente confiáveis para esta análise.",
      };
    case "analysis_partial":
      return {
        title: "Análise parcial",
        body: "Parte da análise ficou disponível. Alguns passos não puderam ser concluídos com as condições atuais.",
      };
    case "analysis_failed":
      return {
        title: "Análise incompleta",
        body: "A análise não pôde ser concluída. Você pode tentar atualizar mais tarde.",
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
      return "Análise em andamento";
    case "generating_signals":
    case "generating_intelligence":
    case "generating_opportunities":
    case "generating_actions":
      return "Enriquecimento em andamento";
    case "needs_user_resolution":
      return "Confirmação necessária";
    case "completed":
      if (outcome === "facts_only" || outcome === "insufficient_evidence") return "Concluída sem sinal";
      return "Análise concluída";
    case "partial":
      return "Concluída parcialmente";
    case "failed":
      return "Falha recuperável";
    case "cancelled":
      return "Cancelada";
    default:
      return "Análise inicial disponível";
  }
}
