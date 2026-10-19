import "server-only";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { resolvePersistedCompanyId, getAccountIntelligence, getCompanyEfesoFit } from "@/server/services/account-query-service";
import { searchOpportunities } from "@/server/services/opportunity-query-service";
import { searchRecommendedActions } from "@/server/services/recommended-action-query-service";
import { getCompanyRelationship } from "@/server/services/relationship-query-service";
import { searchSignals } from "@/server/services/signal-service";
import { formatSignalTitleForDisplay } from "@/lib/signal-display";
import type { AccountIntelligenceView, EfesoFitView } from "@/server/intelligence/types";
import type { OpportunityListItem } from "@/server/opportunities/types";
import type { RecommendedActionListItem } from "@/server/recommended-actions/types";
import type { AccountRelationshipView } from "@/server/relationship/types";
import type { SignalListItem } from "@/server/signals/types";

export interface CompanyBriefing {
  companyId: string;
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
}

export async function getCompanyBriefing(slug: string): Promise<CompanyBriefing | null> {
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const companyId = await resolvePersistedCompanyId(slug);
  if (!companyId) return null;

  const [signals, intelligence, fits, opportunities, relationship, actions] = await Promise.all([
    searchSignals({ companyId, status: "active" }),
    getAccountIntelligence(companyId),
    getCompanyEfesoFit(companyId),
    searchOpportunities({ companyId, status: "active" }),
    getCompanyRelationship(companyId),
    searchRecommendedActions({ companyId, status: "active" }),
  ]);

  const movements = signals.slice(0, 3).map((signal) => ({
    id: signal.id,
    title: formatSignalTitleForDisplay(signal.title),
    eventDate: signal.eventDate,
  }));
  const topFit = fits[0]
    ? { id: fits[0].id, name: fits[0].knowledgeName, level: String(fits[0].fitLevel), reason: fits[0].fitReasonSummary }
    : null;
  const topOpportunity = opportunities[0] ?? null;
  const nextAction = actions[0] ?? null;
  const themes = (intelligence?.themes ?? []).slice(0, 4).map((theme) => theme.canonicalName);

  const reasons: string[] = [];
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
  return {
    companyId,
    movements,
    meaningHeadline: intelligence?.headline
      ? formatSignalTitleForDisplay(intelligence.headline.replace(/^[A-ZÁÉÍÓÚÃÕ][\wÀ-ÿ.&-]*(?:\s+[A-ZÁÉÍÓÚÃÕ][\wÀ-ÿ.&-]*)*:\s*/, "").trim() || intelligence.headline)
      : null,
    meaningSummary: formatMeaningSummary(intelligence?.executiveSummary ?? intelligence?.changeSummary ?? null),
    themes,
    topFit,
    topOpportunity,
    relationship: relationship && !relationship.unavailable ? relationship : relationship,
    nextAction,
    opportunities,
    actions,
    reasons: reasons.slice(0, 5),
    intelligence,
    fits,
    signals,
  };
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
