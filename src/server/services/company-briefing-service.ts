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
import { listResearchRunsForCompany } from "@/server/external-research/persistence";
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

export interface CompanyBriefing {
  companyId: string;
  outcome: ResearchOutcome;
  outcomeTitle: string;
  outcomeBody: string;
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

  const outcome = deriveCompanyResearchOutcome({
    signalCount: signals.length,
    activeClaimCount: activeClaims.length,
    failureCode: latestRun?.failure_code ?? null,
    runStatus: latestRun?.status ?? null,
    insufficientEvidenceForSignal: Boolean(insufficient),
  });
  const outcomeCopy = researchOutcomeMemberCopy(outcome);

  const validatedFacts: ValidatedFactView[] = activeClaims.slice(0, 8).map((trace) => {
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

  const movements = signals.slice(0, 5).map((signal) => ({
    id: signal.id,
    title: formatSignalTitleForDisplay(signal.title),
    eventDate: signal.eventDate,
  }));
  const topFit = fits[0]
    ? { id: fits[0].id, name: fits[0].knowledgeName, level: String(fits[0].fitLevel), reason: fits[0].fitReasonSummary }
    : null;
  const topOpportunity = outcome === "signal_found" ? (opportunities[0] ?? null) : null;
  const nextAction = outcome === "signal_found" ? (actions[0] ?? null) : null;
  const themes = (intelligence?.themes ?? []).slice(0, 4).map((theme) => theme.canonicalName);

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

  return {
    companyId,
    outcome,
    outcomeTitle: outcomeCopy.title,
    outcomeBody: outcomeCopy.body,
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
    opportunities: outcome === "signal_found" ? opportunities : [],
    actions: outcome === "signal_found" ? actions : [],
    reasons: reasons.slice(0, 5),
    intelligence: showIntelligence ? intelligence : null,
    fits: showIntelligence ? fits : [],
    signals,
    sourceCount: new Set(
      traces.flatMap((trace) => trace.evidence.map((item) => item.source.id)),
    ).size,
  };
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
