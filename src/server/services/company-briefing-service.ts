import "server-only";
import { loadResearchAssessment } from "@/server/product/research-assessment";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { resolvePersistedCompanyId, getAccountIntelligence, getCompanyEfesoFit } from "@/server/services/account-query-service";
import { searchOpportunities } from "@/server/services/opportunity-query-service";
import { searchRecommendedActions } from "@/server/services/recommended-action-query-service";
import { getCompanyRelationship } from "@/server/services/relationship-query-service";
import { searchSignals } from "@/server/services/signal-service";
import { formatSignalTitleForDisplay } from "@/lib/signal-display";
import { getTraceabilityForCompany } from "@/server/services/evidence-foundation-service";
import { periodLabelFromClaim } from "@/lib/claim-presentation";
import {
  deriveCompanyResearchOutcome,
  researchOutcomeMemberCopy,
  type ResearchOutcome,
} from "@/server/product/research-outcome";
import { listResearchRunsForCompany, listSourceCandidates } from "@/server/external-research/persistence";
import { evaluateResearchQualityGate } from "@/server/product/research-quality-gate";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import type { AccountIntelligenceView, EfesoFitView } from "@/server/intelligence/types";
import type { OpportunityListItem } from "@/server/opportunities/types";
import type { RecommendedActionListItem } from "@/server/recommended-actions/types";
import type { AccountRelationshipView } from "@/server/relationship/types";
import type { SignalListItem } from "@/server/signals/types";

export interface ValidatedFactView {
  id: string;
  statement: string;
  period: string;
  modality: string;
  sourceLabel: string;
  sourceUrl: string | null;
  sourceDate: string | null;
  metric: string | null; unit: string | null; currency: string | null; confidence: number | null;
  excerpt: string | null;
}

export interface FitNearMissView {
  id: string;
  knowledgeName: string;
  knowledgeType: string | null;
  proposedLevel: string;
  status: string;
  rejectionCode: string | null;
  rejectionLabel: string | null;
  rejectionText: string | null;
  rationale: string;
}

export interface ActionCandidateView {
  id: string;
  title: string;
  actionType: string;
  status: string;
  rationale: string;
  rejectionCode: string | null;
  rejectionLabel: string | null;
}

export interface WorkingHypothesisView {
  id: string;
  title: string;
  summary: string;
  basis: string;
  confidenceNote: string;
}

export interface SuggestedNextStepView {
  id: string;
  title: string;
  summary: string;
  origin: "promoted" | "candidate" | "derived";
}

export interface ReportRiskView {
  id: string;
  text: string;
  severity: "high" | "medium" | "low";
  kind: "company" | "hypothesis" | "research_limitation";
}

export type EfesoFitState =
  | "FIT_NOT_EVALUATED"
  | "NO_RELEVANT_FIT"
  | "KNOWLEDGE_UNAVAILABLE"
  | "FIT_FOUND";

export interface CompanyBriefing {
  companyId: string;
  outcome: ResearchOutcome;
  outcomeTitle: string;
  outcomeBody: string;
  executionStatus: string | null;
  queriedName: string | null;
  canonicalName: string | null;
  corporateCountry: string | null;
  researchGeography: string | null;
  validatedFacts: ValidatedFactView[];
  movements: { id: string; title: string; eventDate: string | null }[];
  meaningHeadline: string | null;
  meaningSummary: string | null;
  themes: string[];
  topFit: { id: string; name: string; level: string; reason: string } | null;
  topOpportunity: OpportunityListItem | null;
  relationship: AccountRelationshipView | null;
  nextAction: RecommendedActionListItem | null;
  opportunities: OpportunityListItem[];
  actions: RecommendedActionListItem[];
  reasons: string[];
  intelligence: AccountIntelligenceView | null;
  fits: EfesoFitView[];
  signals: SignalListItem[];
  sourceCount: number;
  primarySourceCount: number;
  fitNearMisses: FitNearMissView[];
  actionCandidates: ActionCandidateView[];
  workingHypotheses: WorkingHypothesisView[];
  suggestedNextSteps: SuggestedNextStepView[];
  reportRisks: ReportRiskView[];
  researchLimitations: ReportRiskView[];
  commercialGapNote: string | null;
  efesoFitState: EfesoFitState;
  efesoFitMessage: string;
  publishFullReport: boolean;
  phaseTimings: { phase: string; ms: number }[];
}

function modalityLabel(claimType: string, verification: string): string {
  if (verification === "corroborated") return "Corroborado";
  if (verification === "supported") return "Sustentado";
  if (claimType === "fact") return "Fato";
  if (claimType === "derived") return "Derivado";
  return "Validado";
}

function formatMeaningSummary(summary: string | null): string | null {
  if (!summary) return null;
  return summary
    .replace(/\bplanned\b/gi, "planejado")
    .replace(/\bannounced\b/gi, "anunciado")
    .replace(/\breported_actual\b/gi, "reportado")
    .replace(/\bexpected\b/gi, "esperado");
}

function isInternalFitReason(reason: string): boolean {
  return /matched because|capability_match|signal_type_match|component_type|demo_seed/i.test(reason);
}


function buildReportRisks(input: {
  opportunities: OpportunityListItem[];
  intelligence: AccountIntelligenceView | null;
  signals: SignalListItem[];
}): ReportRiskView[] {
  const risks: ReportRiskView[] = [];
  if (input.intelligence?.riskSummary && input.signals.length > 0) {
    risks.push({
      id: "intel-risk",
      text: input.intelligence.riskSummary,
      severity: "medium",
      kind: "company",
    });
  }
  for (const opportunity of input.opportunities) {
    if (opportunity.uncertaintyStatement) {
      risks.push({
        id: `unc-${opportunity.id}`,
        text: opportunity.uncertaintyStatement,
        severity: "medium",
        kind: "hypothesis",
      });
    }
  }
  const unique = new Map(risks.map((risk) => [risk.text, risk]));
  return [...unique.values()].slice(0, 6);
}

function buildResearchLimitations(input: {
  outcome: ResearchOutcome;
  outcomeBody: string;
  sourceCount: number;
  primarySourceCount: number;
  noSupportedOpportunity: boolean;
  opportunityCount: number;
  validatedFactCount: number;
}): ReportRiskView[] {
  const items: ReportRiskView[] = [];
  if (input.outcome === "insufficient_evidence" || input.outcome === "facts_only") {
    items.push({ id: "outcome-gap", text: input.outcomeBody, severity: "high", kind: "research_limitation" });
  }
  if (input.primarySourceCount === 0) {
    items.push({
      id: "no-primary",
      text: "Nenhuma fonte primária/oficial densa foi retida nesta execução.",
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

function resolveEfesoFitState(input: {
  signalCount: number;
  fitCount: number;
  fitNearMissCount: number;
  knowledgeError: boolean;
}): { state: EfesoFitState; message: string } {
  if (input.knowledgeError) {
    return {
      state: "KNOWLEDGE_UNAVAILABLE",
      message: "O conhecimento EFESO não pôde ser consultado nesta execução.",
    };
  }
  if (input.signalCount === 0) {
    return {
      state: "FIT_NOT_EVALUATED",
      message:
        "A aderência EFESO não foi avaliada porque ainda não há evidência suficiente para caracterizar um movimento empresarial relevante.",
    };
  }
  if (input.fitCount > 0) {
    return { state: "FIT_FOUND", message: "Há aderência EFESO sustentada pelos movimentos identificados." };
  }
  if (input.fitNearMissCount > 0 || input.signalCount > 0) {
    return {
      state: "NO_RELEVANT_FIT",
      message: "Os movimentos identificados não apresentaram aderência suficiente às capabilities EFESO disponíveis.",
    };
  }
  return {
    state: "NO_RELEVANT_FIT",
    message: "Os movimentos identificados não apresentaram aderência suficiente às capabilities EFESO disponíveis.",
  };
}

function buildCommercialGapNote(input: {
  fitCount: number;
  fitNearMissCount: number;
  opportunityCount: number;
  noSupportedOpportunity: boolean;
  actionCount: number;
}): string | null {
  if (input.fitCount > 0 && input.opportunityCount > 0 && input.actionCount > 0) return null;
  const parts: string[] = [];
  if (input.fitCount === 0 && input.fitNearMissCount > 0) {
    parts.push(
      `${input.fitNearMissCount} candidato(s) de aderência EFESO foram avaliados e não promovidos pela validação automática.`,
    );
  } else if (input.fitCount === 0) {
    parts.push("Nenhuma aderência EFESO ativa foi promovida para esta conta.");
  }
  if (input.opportunityCount === 0 || input.noSupportedOpportunity) {
    parts.push("Sem oportunidade sustentada, o relatório prioriza hipóteses de trabalho e próximos passos de validação.");
  }
  return parts.join(" ") || null;
}

export async function getCompanyBriefing(slug: string): Promise<CompanyBriefing | null> {
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const companyId = await resolvePersistedCompanyId(slug);
  if (!companyId) return null;

  const [allSignals, intelligence, allFits, allOpportunities, relationship, allActions, traces] = await Promise.all([
    searchSignals({ companyId, status: "active" }),
    getAccountIntelligence(companyId),
    getCompanyEfesoFit(companyId),
    searchOpportunities({ companyId, status: "active" }),
    getCompanyRelationship(companyId),
    searchRecommendedActions({ companyId, status: "active" }),
    getTraceabilityForCompany(companyId),
  ]);

  let signals = allSignals;
  let latestRun: Awaited<ReturnType<typeof listResearchRunsForCompany>>[number] | null = null;
  try {
    const workspace = await workspaceRepository.getCurrentWorkspace();
    if (workspace) {
      const runs = await listResearchRunsForCompany(workspace.id, companyId);
      latestRun = runs[0] ?? null;
    }
  } catch {
    latestRun = null;
  }

  let activeClaims = traces.filter(
    (trace) =>
      trace.claim.claim_status === "active" &&
      (trace.claim.verification_status === "supported" ||
        trace.claim.verification_status === "corroborated" ||
        trace.claim.claim_type === "fact"),
  );

  let primarySourceCount = 0;
  let retainedSourceCount = 0;
  const phaseTimings: { phase: string; ms: number }[] = [];
  if (latestRun) {
    try {
      const candidates = await listSourceCandidates(latestRun.id);
      const retained = candidates.filter(
        (row) => row.status !== "rejected" && row.status !== "discovered" && Boolean(row.snapshot_id),
      );
      retainedSourceCount = retained.length;
      primarySourceCount = retained.filter((row) => row.source_quality === "primary").length;
    } catch {
      primarySourceCount = 0;
    }
  }
  const payload =
    latestRun?.resolution_payload && typeof latestRun.resolution_payload === "object"
      ? (latestRun.resolution_payload as Record<string, unknown>)
      : {};
  const assessment = latestRun ? await loadResearchAssessment(latestRun) : null;
  const gate = assessment ?? evaluateResearchQualityGate({
    signalCount:0, activeClaimCount:0, primarySourceCount:0, secondaryOnlyClaimCount:0,
    recentMaterialClaimCount:0, entityConfirmed:false,
  });
  if (assessment) {
    const qualified = new Set(assessment.qualifiedClaimIds);
    activeClaims = activeClaims.filter(trace=>qualified.has(trace.claim.id));
    const qualifiedSignals = new Set(assessment.qualifiedSignalIds);
    signals = signals.filter(signal=>qualifiedSignals.has(signal.id));
  } else { activeClaims=[]; signals=[]; }
  const signalIds = new Set(signals.map(signal=>signal.id));
  const fits = allFits.filter(fit=>fit.operationalChain && fit.operationalChain.signalIds.every(id=>signalIds.has(id)));
  const opportunities = allOpportunities.filter(opportunity=>opportunity.triggerSignalId && signalIds.has(opportunity.triggerSignalId));
  const opportunityIds = new Set(opportunities.map(o=>o.id));
  const actions = allActions.filter(action=>action.opportunityId && opportunityIds.has(action.opportunityId));
  primarySourceCount = assessment?.primarySourceCount ?? 0;
  const outcome = gate.researchOutcome;
  const outcomeCopy = researchOutcomeMemberCopy(outcome);
  // Keep deriveCompanyResearchOutcome reachable for tests / parity.
  void deriveCompanyResearchOutcome;

  const validatedFacts: ValidatedFactView[] = activeClaims.slice(0, 24).map((trace) => {
    const primary = trace.evidence[0];
    return {
      id: trace.claim.id,
      statement: trace.claim.statement,
      period: periodLabelFromClaim(trace.claim),
      modality: modalityLabel(trace.claim.claim_type, trace.claim.verification_status),
      sourceLabel: primary?.source.publisher_name ?? primary?.snapshot.title ?? "Fonte pública",
      sourceUrl:primary?.source.canonical_url ?? null,sourceDate:primary?.snapshot.publication_date ?? null,
      metric:trace.claim.metric_name,unit:trace.claim.unit,currency:trace.claim.currency_code,confidence:trace.claim.confidence_score,
      excerpt: primary?.fragment.excerpt ?? null,
    };
  });

  const movements = signals.slice(0, 12).map((signal) => ({
    id: signal.id,
    title: formatSignalTitleForDisplay(signal.title),
    eventDate: signal.eventDate,
  }));
  const topFit = fits[0]
    ? { id: fits[0].id, name: fits[0].knowledgeName, level: String(fits[0].fitLevel), reason: fits[0].fitReasonSummary }
    : null;
  const showCommercial = outcome === "signal_found" || outcome === "analysis_partial";
  const topOpportunity = showCommercial ? (opportunities[0] ?? null) : null;
  const nextAction = showCommercial ? (actions[0] ?? null) : null;
  const themes = (intelligence?.themes ?? []).slice(0, 8).map((theme) => theme.canonicalName);

  const reasons: string[] = [];
  if (outcome === "facts_only" || outcome === "insufficient_evidence") {
    reasons.push(outcomeCopy.body);
  } else {
    if (signals.some((signal) => /capacit|ramp|investimento|expans/i.test(`${signal.title} ${signal.summary}`))) {
      reasons.push("Há movimentos recentes de capacidade, investimento ou ramp-up.");
    } else if (movements[0]) {
      reasons.push(`O movimento mais recente é: ${movements[0].title}.`);
    }
    if (themes[0]) reasons.push(`${themes[0]} aparece como tema recorrente.`);
    if (topFit && (topFit.level === "high" || topFit.level === "medium")) {
      reasons.push(`${topFit.name} tem ${topFit.level === "high" ? "alta" : "média"} aderência EFESO.`);
    }
    if (topFit?.reason && !isInternalFitReason(topFit.reason)) {
      const short = topFit.reason.replace(/\s+/g, " ").trim();
      if (short && !reasons.some((item) => item.includes(short.slice(0, 24)))) {
        reasons.push(short.length > 140 ? `${short.slice(0, 137)}…` : short);
      }
    }
    if (topOpportunity) reasons.push(`A hipótese principal é ${topOpportunity.title}.`);
    if (relationship && !relationship.unavailable && relationship.relationshipStrength !== "unknown") {
      reasons.push("Há contexto de relacionamento registrado para orientar o próximo passo.");
    }
  }

  const showIntelligence = outcome === "signal_found" || outcome === "analysis_partial";
  const fitNearMisses: FitNearMissView[] = [];
  const actionCandidates: ActionCandidateView[] = [];
  const noSupportedOpportunity = Boolean(
    latestRun?.resolution_payload &&
      typeof latestRun.resolution_payload === "object" &&
      (latestRun.resolution_payload as { no_supported_opportunity?: boolean }).no_supported_opportunity === true,
  );

  const workingHypotheses: WorkingHypothesisView[] = [];
  const suggestedNextSteps: SuggestedNextStepView[] = (showCommercial ? actions : []).map(action=>({id:action.id,title:action.title,summary:action.rationale,origin:"promoted"}));
  const sourceCount =
    retainedSourceCount ||
    new Set(traces.flatMap((trace) => trace.evidence.map((item) => item.source.id))).size;
  const reportRisks = buildReportRisks({
    opportunities: showCommercial ? opportunities : [],
    intelligence,
    signals,
  });
  const researchLimitations = buildResearchLimitations({
    outcome,
    outcomeBody: outcomeCopy.body,
    sourceCount,
    primarySourceCount,
    noSupportedOpportunity,
    opportunityCount: showCommercial ? opportunities.length : 0,
    validatedFactCount: validatedFacts.length,
  });
  const commercialGapNote = buildCommercialGapNote({
    fitCount: showIntelligence ? fits.length : 0,
    fitNearMissCount: fitNearMisses.length,
    opportunityCount: showCommercial ? opportunities.length : 0,
    noSupportedOpportunity,
    actionCount: showCommercial ? actions.length : 0,
  });
  const efeso = resolveEfesoFitState({
    signalCount: signals.length,
    fitCount: fits.length,
    fitNearMissCount: fitNearMisses.length,
    knowledgeError: payload.fit_state === "KNOWLEDGE_UNAVAILABLE" || (signals.length > 0 && !["NO_RELEVANT_FIT", "FIT_FOUND"].includes(String(payload.fit_state))),
  });
  const candidatePayload =
    payload.candidate && typeof payload.candidate === "object"
      ? (payload.candidate as Record<string, unknown>)
      : {};

  return {
    companyId,
    outcome,
    outcomeTitle: outcomeCopy.title,
    outcomeBody: outcomeCopy.body,
    executionStatus: typeof payload.execution_status === "string" ? payload.execution_status : latestRun?.status ?? null,
    queriedName: typeof payload.queriedName === "string" ? payload.queriedName : latestRun?.requested_query ?? null,
    canonicalName:
      typeof payload.canonicalName === "string"
        ? payload.canonicalName
        : typeof candidatePayload.canonicalName === "string"
          ? candidatePayload.canonicalName
          : null,
    corporateCountry:
      typeof payload.corporateCountry === "string"
        ? payload.corporateCountry
        : typeof candidatePayload.headquartersCountry === "string"
          ? candidatePayload.headquartersCountry
          : null,
    researchGeography:
      typeof payload.researchGeography === "string"
        ? payload.researchGeography
        : latestRun?.requested_country ?? null,
    validatedFacts,
    movements,
    meaningHeadline: showIntelligence && intelligence?.headline
      ? formatSignalTitleForDisplay(
          intelligence.headline
            .replace(/^[A-ZÁÉÍÓÚÃÕ][\wÀ-ÿ.&-]*(?:\s+[A-ZÁÉÍÓÚÃÕ][\wÀ-ÿ.&-]*)*:\s*/, "")
            .trim() || intelligence.headline,
        )
      : null,
    meaningSummary: showIntelligence
      ? formatMeaningSummary(intelligence?.executiveSummary ?? intelligence?.changeSummary ?? null)
      : null,
    themes: showIntelligence ? themes : [],
    topFit: showIntelligence ? topFit : null,
    topOpportunity,
    relationship: relationship && !relationship.unavailable ? relationship : relationship,
    nextAction,
    opportunities: showCommercial ? opportunities : [],
    actions: showCommercial ? actions : [],
    reasons: reasons.slice(0, 10),
    intelligence: showIntelligence ? intelligence : null,
    fits: showIntelligence ? fits : [],
    signals,
    sourceCount,
    primarySourceCount,
    fitNearMisses,
    actionCandidates,
    workingHypotheses: gate.publishFullReport ? workingHypotheses : [],
    suggestedNextSteps: gate.publishFullReport ? suggestedNextSteps : [],
    reportRisks,
    researchLimitations,
    commercialGapNote,
    efesoFitState: efeso.state,
    efesoFitMessage: efeso.message,
    publishFullReport: gate.publishFullReport,
    phaseTimings,
  };
}
