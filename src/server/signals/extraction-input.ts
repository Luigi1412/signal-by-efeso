import type { ExtractedSignal } from "@/server/ai/schemas/signal-extraction-schema";
import { mapSuggestedTag } from "@/server/knowledge/taxonomy";
import { SIGNAL_CLAIM_RELATIONSHIPS, SIGNAL_COMPANY_ROLES, coreEventPhrase } from "./taxonomy";
import type { SignalCandidateDraft, SignalClaimContext, SignalClaimLink, SignalCompanyLink } from "./types";

export function serializeSignalExtractionInput(input: {
  company: { id: string; displayName: string; slug: string; industry: string | null; countryCode: string | null };
  claims: SignalClaimContext[];
}): string {
  return JSON.stringify({
    company: {
      id: input.company.id,
      display_name: input.company.displayName,
      slug: input.company.slug,
      industry: input.company.industry,
      country_code: input.company.countryCode,
    },
    claims: input.claims.map((claim) => ({
      claim_id: claim.id,
      statement: claim.statement,
      assertion_mode: claim.assertionMode,
      metric_name: claim.metricName,
      numeric_value: claim.numericValue,
      unit: claim.unit,
      currency_code: claim.currencyCode,
      geography: {
        level: claim.geographyLevel,
        country_code: claim.countryCode,
        state_region: claim.stateRegion,
        city: claim.city,
      },
      period: {
        start: claim.periodStart,
        end: claim.periodEnd,
        as_of: claim.asOfDate,
      },
      source_snapshot_id: claim.sourceSnapshotId,
    })),
  });
}

export function serializeSignalValidationInput(input: {
  draft: SignalCandidateDraft;
  claims: SignalClaimContext[];
  existingTitles: string[];
}): string {
  return JSON.stringify({
    candidate: {
      signal_type: input.draft.signalType,
      signal_nature: input.draft.signalNature,
      title: input.draft.title,
      summary: input.draft.summary,
      assertion_mode: input.draft.assertionMode,
      geography: input.draft.geography,
      event_date: input.draft.eventDate,
      period_start: input.draft.effectivePeriodStart,
      period_end: input.draft.effectivePeriodEnd,
      metric_name: input.draft.metricName,
      numeric_value: input.draft.numericValue,
      unit: input.draft.unit,
      claims: input.draft.claims,
    },
    claims: input.claims.map((claim) => ({
      claim_id: claim.id,
      statement: claim.statement,
      assertion_mode: claim.assertionMode,
      company_id: claim.companyId,
      numeric_value: claim.numericValue,
      unit: claim.unit,
      country_code: claim.countryCode,
      period_start: claim.periodStart,
      period_end: claim.periodEnd,
    })),
    existing_titles: input.existingTitles,
  });
}

export function extractedSignalToDraft(signal: ExtractedSignal): SignalCandidateDraft {
  const claims: SignalClaimLink[] = signal.claims
    .filter((link) =>
      SIGNAL_CLAIM_RELATIONSHIPS.includes(link.relationship_type as (typeof SIGNAL_CLAIM_RELATIONSHIPS)[number]),
    )
    .map((link) => ({
      claimId: link.claim_id,
      relationshipType: link.relationship_type,
    }));
  const companies: SignalCompanyLink[] = signal.companies
    .filter((row) => SIGNAL_COMPANY_ROLES.includes(row.role as (typeof SIGNAL_COMPANY_ROLES)[number]))
    .map((row) => ({ companyId: row.company_id, role: row.role }));
  return {
    signalType: signal.signal_type,
    signalNature: signal.signal_nature,
    title: signal.title.trim(),
    summary: signal.summary.trim(),
    suggestedImportance: signal.suggested_importance,
    assertionMode: signal.assertion_mode,
    eventDate: emptyToNull(signal.event_date),
    effectivePeriodStart: emptyToNull(signal.effective_period_start),
    effectivePeriodEnd: emptyToNull(signal.effective_period_end),
    geography: emptyToNull(signal.geography),
    metricName: emptyToNull(signal.metric_name),
    numericValue: signal.numeric_value,
    unit: emptyToNull(signal.unit),
    currencyCode: emptyToNull(signal.currency_code),
    coreEvent: (emptyToNull(signal.core_event) ?? coreEventPhrase(signal.title)),
    tags: signal.tags.flatMap((tag) => {
      const mapped = mapSuggestedTag(tag.category, tag.name);
      return mapped.ok ? [{ category: mapped.category, canonicalName: mapped.canonicalName }] : [];
    }),
    companies,
    parentSignalId: emptyToNull(signal.parent_signal_id),
    claims,
  };
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
