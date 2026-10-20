import "server-only";
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
import { listEfesoFitCandidatesForCompany } from "@/server/intelligence/persistence";
import { listActionCandidatesForCompany } from "@/server/recommended-actions/persistence";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
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
  | "not_evaluated_no_signal"
  | "evaluated_no_fit"
  | "knowledge_error"
  | "fit_found";

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

async function loadFitNearMisses(companyId: string): Promise<FitNearMissView[]> {
  try {
    const rows = await listEfesoFitCandidatesForCompany(companyId);
    const relevant = rows.filter((row) => row.status === "rejected" || row.status === "needs_review").slice(0, 8);
    if (relevant.length === 0) return [];
    const knowledgeIds = [...new Set(relevant.map((row) => row.knowledge_object_id))];
    const admin = createPipelineAdminClient();
    const { data: knowledgeRows } = await admin
      .from("efeso_knowledge_objects")
      .select("id, canonical_name, object_type, short_description")
      .in("id", knowledgeIds);
    const knowledgeById = new Map(
      (knowledgeRows ?? []).map((row) => [
        String((row as { id: string }).id),
        row as { id: string; canonical_name: string; object_type: string; short_description: string },
      ]),
    );
    return relevant.map((row) => {
      const knowledge = knowledgeById.get(row.knowledge_object_id);
      return {
        id: row.id,
        knowledgeName: knowledge?.canonical_name ?? "Conhecimento EFESO",
        knowledgeType: knowledge?.object_type ?? null,
        proposedLevel: row.proposed_fit_level,
        status: row.status,
        rejectionCode: row.rejection_reason_code,
        rejectionLabel: rejectionLabel(row.rejection_reason_code),
        rejectionText: row.rejection_reason_text,
        rationale: cleanRationale(row.proposed_rationale),
      };
    });
  } catch {
    return [];
  }
}

async function loadActionCandidates(companyId: string): Promise<ActionCandidateView[]> {
  try {
    const rows = await listActionCandidatesForCompany(companyId);
    return rows
      .filter((row) => row.status === "needs_review" || row.status === "rejected" || row.status === "validated")
      .slice(0, 6)
      .map((row) => ({
        id: row.id,
        title: row.proposed_title,
        actionType: row.proposed_action_type,
        status: row.status,
        rationale: cleanRationale(row.proposed_rationale),
        rejectionCode: row.rejection_reason_code,
        rejectionLabel: rejectionLabel(row.rejection_reason_code),
      }));
  } catch {
    return [];
  }
}

function buildWorkingHypotheses(input: {
  signals: SignalListItem[];
  themes: string[];
  fitNearMisses: FitNearMissView[];
  hasPromotedOpportunities: boolean;
}): WorkingHypothesisView[] {
  if (input.hasPromotedOpportunities) return [];
  const hypotheses: WorkingHypothesisView[] = [];
  const rampSignals = input.signals.filter((signal) =>
    /ramp|capacit|produ(c|ç)|deliver|backlog|expans/i.test(`${signal.signalType} ${signal.title} ${signal.summary}`),
  );
  if (rampSignals.length > 0) {
    hypotheses.push({
      id: "hyp-ramp",
      title: "Hipótese de trabalho: apoio a ramp-up / nivelamento operacional",
      summary:
        "Os sinais indicam aceleração de produção ou entregas. Isso pode abrir conversa sobre estabilidade de processo, capacidade e supply chain — ainda sem oportunidade promovida pelo validador.",
      basis: rampSignals
        .slice(0, 3)
        .map((signal) => signal.title)
        .join(" · "),
      confidenceNote: "Hipótese analítica — não é oportunidade EFESO promovida.",
    });
  }
  const maSignals = input.signals.filter((signal) =>
    /aquisi|fus[aã]o|m&a|takeover|compra|integra/i.test(`${signal.signalType} ${signal.title} ${signal.summary}`),
  );
  if (maSignals.length > 0 && hypotheses.length < 3) {
    hypotheses.push({
      id: "hyp-ma",
      title: "Hipótese de trabalho: integração pós-aquisição / sinergia operacional",
      summary:
        "Há movimento público de M&A ou integração. Ângulos típicos: harmonização de processos, supply chain, excelência operacional e captura de sinergias — ainda sem oportunidade promovida.",
      basis: maSignals
        .slice(0, 3)
        .map((signal) => signal.title)
        .join(" · "),
      confidenceNote: "Hipótese analítica — não é oportunidade EFESO promovida.",
    });
  }
  const investSignals = input.signals.filter((signal) =>
    /invest|capex|f[aá]brica|planta|greenfield|brownfield/i.test(`${signal.signalType} ${signal.title} ${signal.summary}`),
  );
  if (investSignals.length > 0 && hypotheses.length < 3) {
    hypotheses.push({
      id: "hyp-invest",
      title: "Hipótese de trabalho: suporte a investimento / ramp de capacidade",
      summary:
        "Sinais de investimento ou nova capacidade sugerem conversa sobre readiness operacional, ramp-up e governança de projeto — sujeito a confirmação com fontes oficiais.",
      basis: investSignals
        .slice(0, 3)
        .map((signal) => signal.title)
        .join(" · "),
      confidenceNote: "Hipótese analítica — não é oportunidade EFESO promovida.",
    });
  }
  if (input.fitNearMisses.length > 0) {
    const top = input.fitNearMisses[0];
    hypotheses.push({
      id: "hyp-fit-near",
      title: `Sobreposição potencial com ${top.knowledgeName}`,
      summary:
        top.rationale ||
        "Houve matching preliminar com conhecimento EFESO, mas a aderência não passou na validação automática.",
      basis: top.rejectionLabel
        ? `Motivo da não promoção: ${top.rejectionLabel}`
        : "Candidato de aderência não promovido.",
      confidenceNote: "Near-miss de aderência — requer revisão humana antes de uso comercial.",
    });
  }
  if (input.themes.length > 0 && hypotheses.length < 2) {
    hypotheses.push({
      id: "hyp-theme",
      title: `Leitura temática: ${input.themes[0]}`,
      summary:
        "Os temas recorrentes da conta sugerem ângulos de exploração comercial, mas ainda faltam evidências ou matching de conhecimento suficientes para promover uma oportunidade.",
      basis: `Temas: ${input.themes.slice(0, 4).join(" · ")}`,
      confidenceNote: "Orientação de investigação — não constitui oferta.",
    });
  }
  return hypotheses.slice(0, 3);
}

function buildSuggestedNextSteps(input: {
  actions: RecommendedActionListItem[];
  actionCandidates: ActionCandidateView[];
  signals: SignalListItem[];
  fitNearMisses: FitNearMissView[];
  workingHypotheses: WorkingHypothesisView[];
}): SuggestedNextStepView[] {
  const steps: SuggestedNextStepView[] = input.actions.map((action) => ({
    id: action.id,
    title: action.title,
    summary: action.rationale,
    origin: "promoted" as const,
  }));
  for (const candidate of input.actionCandidates) {
    if (steps.some((step) => step.title === candidate.title)) continue;
    steps.push({
      id: candidate.id,
      title: candidate.title,
      summary: [
        candidate.rationale,
        candidate.status === "needs_review" ? "Status: aguarda revisão." : null,
        candidate.rejectionLabel ? `Bloqueio: ${candidate.rejectionLabel}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
      origin: "candidate",
    });
  }
  if (steps.length === 0 && input.signals.length > 0) {
    steps.push({
      id: "step-validate-signals",
      title: "Validar os sinais recentes com o dono da conta",
      summary:
        "Confirmar se os movimentos públicos (capacidade, entregas, investimentos) já são conhecidos internamente e se há conversa aberta com o cliente.",
      origin: "derived",
    });
  }
  if (input.fitNearMisses.length > 0 && !steps.some((step) => /case|conhecimento|aderência/i.test(step.title))) {
    steps.push({
      id: "step-review-fit",
      title: "Revisar near-misses de aderência EFESO",
      summary: `${input.fitNearMisses.length} candidato(s) de conhecimento foram avaliados e não promovidos. Vale checar se o matching de indústria/caso está correto no catálogo.`,
      origin: "derived",
    });
  }
  if (input.workingHypotheses.length > 0 && steps.length < 3) {
    steps.push({
      id: "step-test-hypothesis",
      title: "Testar a hipótese de trabalho com evidência adicional",
      summary:
        "Buscar fontes oficiais mais densas (IR, earnings, filings) e confirmar se o ângulo operacional tem tração antes de qualquer abordagem comercial.",
      origin: "derived",
    });
  }
  return steps.slice(0, 5);
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
      state: "knowledge_error",
      message: "O conhecimento EFESO não pôde ser consultado nesta execução.",
    };
  }
  if (input.signalCount === 0) {
    return {
      state: "not_evaluated_no_signal",
      message:
        "A aderência EFESO não foi avaliada porque ainda não há evidência suficiente para caracterizar um movimento empresarial relevante.",
    };
  }
  if (input.fitCount > 0) {
    return { state: "fit_found", message: "Há aderência EFESO sustentada pelos movimentos identificados." };
  }
  if (input.fitNearMissCount > 0 || input.signalCount > 0) {
    return {
      state: "evaluated_no_fit",
      message: "Os movimentos identificados não apresentaram aderência suficiente às capabilities EFESO disponíveis.",
    };
  }
  return {
    state: "evaluated_no_fit",
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

function rejectionLabel(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "unsupported_inference":
      return "Inferência comercial sem suporte suficiente";
    case "case_relevance":
      return "Relevância de caso/indústria insuficiente";
    case "relationship_honesty":
      return "Contexto de relacionamento incompleto";
    case "quote_integrity":
      return "Integridade de citação";
    default:
      return code.replaceAll("_", " ");
  }
}

function cleanRationale(text: string): string {
  return text
    .replace(/^Justificativa:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);
}


export async function getCompanyBriefing(slug: string): Promise<CompanyBriefing | null> {
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const companyId = await resolvePersistedCompanyId(slug);
  if (!companyId) return null;

  const [signals, intelligence, fits, opportunities, relationship, actions, traces] = await Promise.all([
    searchSignals({ companyId, status: "active" }),
    getAccountIntelligence(companyId),
    getCompanyEfesoFit(companyId),
    searchOpportunities({ companyId, status: "active" }),
    getCompanyRelationship(companyId),
    searchRecommendedActions({ companyId, status: "active" }),
    getTraceabilityForCompany(companyId),
  ]);

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

  const activeClaims = traces.filter(
    (trace) =>
      trace.claim.claim_status === "active" &&
      (trace.claim.verification_status === "supported" ||
        trace.claim.verification_status === "corroborated" ||
        trace.claim.claim_type === "fact"),
  );

  const insufficient =
    latestRun?.resolution_payload &&
    typeof latestRun.resolution_payload === "object" &&
    (latestRun.resolution_payload as { insufficient_evidence_for_signal?: boolean }).insufficient_evidence_for_signal ===
      true;

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
  const secondaryOnlyClaimCount =
    primarySourceCount === 0 && activeClaims.length > 0 ? activeClaims.length : 0;
  const gate = evaluateResearchQualityGate({
    signalCount: signals.length,
    activeClaimCount: activeClaims.length,
    primarySourceCount,
    secondaryOnlyClaimCount,
    recentMaterialClaimCount: activeClaims.length,
    entityConfirmed: Boolean(payload.canonicalName || payload.candidate),
    runStatus: latestRun?.status ?? null,
    failureCode: latestRun?.failure_code ?? null,
    unavailableSourceCount: latestRun?.unavailable_source_count ?? 0,
    insufficientEvidenceForSignal: Boolean(insufficient),
  });
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
  const fitNearMisses = await loadFitNearMisses(companyId);
  const actionCandidates = await loadActionCandidates(companyId);
  const noSupportedOpportunity = Boolean(
    latestRun?.resolution_payload &&
      typeof latestRun.resolution_payload === "object" &&
      (latestRun.resolution_payload as { no_supported_opportunity?: boolean }).no_supported_opportunity === true,
  );

  const workingHypotheses = buildWorkingHypotheses({
    signals,
    themes,
    fitNearMisses,
    hasPromotedOpportunities: opportunities.length > 0,
  });
  const suggestedNextSteps = buildSuggestedNextSteps({
    actions: showCommercial ? actions : [],
    actionCandidates,
    signals,
    fitNearMisses,
    workingHypotheses,
  });
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
    knowledgeError: false,
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
