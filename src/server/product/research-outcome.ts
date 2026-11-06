/**
 * Honest executive outcomes for research / company summary (member surface).
 * Technical codes stay admin-only.
 */

import { evaluateResearchQualityGate } from "./research-quality-gate";

export const RESEARCH_OUTCOMES = [
  "signal_found",
  "facts_only",
  "insufficient_evidence",
  "research_coverage_insufficient",
  "no_reliable_sources",
  "analysis_partial",
  "analysis_failed",
] as const;

export type ResearchOutcome = (typeof RESEARCH_OUTCOMES)[number];

export function deriveCompanyResearchOutcome(input: {
  signalCount: number;
  qualifiedSignalCount?: number;
  preciseClaimCount?: number;
  provenanceClaimCount?: number;
  activeClaimCount: number;
  failureCode?: string | null;
  runStatus?: string | null;
  insufficientEvidenceForSignal?: boolean;
  primarySourceCount?: number;
  secondaryOnlyClaimCount?: number;
  recentMaterialClaimCount?: number;
  entityConfirmed?: boolean;
  unavailableSourceCount?: number;
  coverageVerdict?: "adequate" | "research_coverage_insufficient" | "public_evidence_insufficient" | null;
}): ResearchOutcome {
  const gate = evaluateResearchQualityGate({
    signalCount: input.signalCount,
    qualifiedSignalCount: input.qualifiedSignalCount, preciseClaimCount: input.preciseClaimCount, provenanceClaimCount: input.provenanceClaimCount,
    activeClaimCount: input.activeClaimCount,
    primarySourceCount: input.primarySourceCount ?? 0,
    secondaryOnlyClaimCount: input.secondaryOnlyClaimCount ?? 0,
    recentMaterialClaimCount:
      input.recentMaterialClaimCount ?? 0,
    entityConfirmed: input.entityConfirmed ?? false,
    runStatus: input.runStatus,
    failureCode: input.failureCode,
    unavailableSourceCount: input.unavailableSourceCount,
    insufficientEvidenceForSignal: input.insufficientEvidenceForSignal,
    coverageVerdict: input.coverageVerdict ?? null,
  });
  return gate.researchOutcome;
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
        body: "As informações públicas recuperadas ainda são insuficientes para uma conclusão confiável — fontes oficiais densas ou movimentos recentes materiais não foram retidos.",
      };
    case "research_coverage_insufficient":
      return {
        title: "Cobertura de pesquisa insuficiente",
        body: "A identidade oficial foi confirmada, mas a execução não reteve uma base documental oficial densa o bastante. Isso indica falha de cobertura do mecanismo, não necessariamente ausência de evidência pública.",
      };
    case "no_reliable_sources":
      return {
        title: "Sem fontes confiáveis",
        body: "Não encontramos fontes públicas suficientemente confiáveis para esta análise.",
      };
    case "analysis_partial":
      return {
        title: "Pesquisa concluída com ressalvas",
        body: "A execução terminou com avisos (por exemplo, fontes indisponíveis). Trate a leitura como provisória.",
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
      if (outcome === "facts_only") return "Concluída — fatos sem sinal";
      if (outcome === "insufficient_evidence") return "Concluída — evidência insuficiente";
      if (outcome === "research_coverage_insufficient") return "Concluída — cobertura insuficiente";
      if (outcome === "signal_found") return "Concluída — sinal identificado";
      return "Pesquisa concluída";
    case "partial":
      return "Concluída com avisos";
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
