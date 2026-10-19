import type { AccountIntelligenceExtractionOutput } from "@/server/ai/schemas/account-intelligence-extraction-schema";
import { ACCOUNT_INTELLIGENCE_EXTRACTION_SCHEMA_VERSION } from "@/server/ai/versions";
import type { AccountNarrativeDraft, AccountSignalInput, AccountThemeDraft, AccountTensionDraft, FitDerivationResult, KnowledgeFitTarget } from "./types";

export function serializeAccountIntelligenceInput(input: {
  company: { id: string; displayName: string; industry: string | null; countryCode: string | null };
  signals: AccountSignalInput[];
  themes: AccountThemeDraft[];
  tensions: AccountTensionDraft[];
}): Record<string, unknown> {
  return {
    company: input.company,
    signals: input.signals.map((signal) => ({
      id: signal.id,
      signal_type: signal.signalType,
      signal_nature: signal.signalNature,
      title: signal.title,
      summary: signal.summary,
      importance: signal.importance,
      assertion_mode: signal.assertionMode,
      event_date: signal.eventDate,
      geography: signal.geography,
      claims: signal.claims.slice(0, 3),
      evidence_snippets: signal.evidenceSnippets.slice(0, 2),
      tags: signal.tags.map((tag) => ({ category: tag.category, name: tag.canonicalName })),
    })),
    recurring_themes: input.themes.map((theme) => ({
      category: theme.category,
      name: theme.canonicalName,
      signal_count: theme.signalCount,
      weighted_importance: theme.weightedImportance,
      last_seen_at: theme.lastSeenAt,
    })),
    tensions: input.tensions,
  };
}

export function serializeAccountIntelligenceValidationInput(input: {
  draft: AccountNarrativeDraft;
  signals: AccountSignalInput[];
  themes: AccountThemeDraft[];
  tensions: AccountTensionDraft[];
}): Record<string, unknown> {
  return {
    narrative: input.draft,
    signal_titles: input.signals.map((signal) => ({
      id: signal.id,
      title: signal.title,
      signal_type: signal.signalType,
      assertion_mode: signal.assertionMode,
      event_date: signal.eventDate,
      geography: signal.geography,
    })),
    themes: input.themes,
    tensions: input.tensions,
  };
}

export function extractionToNarrative(output: AccountIntelligenceExtractionOutput): AccountNarrativeDraft {
  const sections: AccountNarrativeDraft["sections"] = {};
  for (const section of output.sections) {
    if (section.text.trim()) sections[section.key] = section.text.trim();
  }
  return {
    headline: output.headline,
    executiveSummary: output.executive_summary,
    strategicDirection: output.strategic_direction,
    pressureSummary: output.pressure_summary,
    investmentSummary: output.investment_summary,
    operatingContextSummary: output.operating_context_summary,
    riskSummary: output.risk_summary,
    changeSummary: output.change_summary,
    sections,
    periodStart: output.period_start,
    periodEnd: output.period_end,
  };
}

export function narrativeToExtractionOutput(draft: AccountNarrativeDraft): AccountIntelligenceExtractionOutput {
  return {
    schema_version: ACCOUNT_INTELLIGENCE_EXTRACTION_SCHEMA_VERSION,
    headline: draft.headline,
    executive_summary: draft.executiveSummary,
    strategic_direction: draft.strategicDirection,
    pressure_summary: draft.pressureSummary,
    investment_summary: draft.investmentSummary,
    operating_context_summary: draft.operatingContextSummary,
    risk_summary: draft.riskSummary,
    change_summary: draft.changeSummary,
    sections: Object.entries(draft.sections)
      .filter(([, text]) => Boolean(text?.trim()))
      .map(([key, text]) => ({ key: key as AccountIntelligenceExtractionOutput["sections"][number]["key"], text: text ?? "" })),
    period_start: draft.periodStart,
    period_end: draft.periodEnd,
  };
}

export function serializeFitValidationInput(input: {
  company: { id: string; displayName: string; industry: string | null };
  knowledge: KnowledgeFitTarget;
  derivation: FitDerivationResult;
  signals: AccountSignalInput[];
}): Record<string, unknown> {
  return {
    company: input.company,
    knowledge: {
      id: input.knowledge.id,
      type: input.knowledge.objectType,
      name: input.knowledge.canonicalName,
      tags: input.knowledge.tags,
    },
    fit_level: input.derivation.fitLevel,
    fit_score: input.derivation.fitScore,
    components: input.derivation.components,
    rationale: input.derivation.rationale,
    signal_ids: input.signals.map((signal) => signal.id),
  };
}
