import { classifyTemporalState, recencyScore } from "@/server/intelligence/temporal";
import type { AccountSignalInput } from "@/server/intelligence/types";
import {
  EXPLICIT_NEED_SIGNAL_TYPES,
  OPPORTUNITY_TYPE_TO_CAPABILITIES,
  SIGNAL_TYPE_TO_OPPORTUNITY_TYPES,
  type OpportunityAssertionMode,
  type OpportunityConfidenceTier,
  type OpportunityLevel,
  type OpportunityMaturity,
  type OpportunityType,
} from "./taxonomy";
import type { ActiveFitInput, OpportunityDraft, OpportunityDerivationInput } from "./types";

const CONSERVATIVE_ASSERTION: OpportunityAssertionMode[] = [
  "unspecified",
  "conditional",
  "estimated",
  "target",
  "expected",
  "planned",
  "announced",
  "reported_actual",
];

export function opportunityTypesForSignal(signalType: string): OpportunityType[] {
  return SIGNAL_TYPE_TO_OPPORTUNITY_TYPES[signalType] ?? [];
}

export function fitAlignsWithType(fit: ActiveFitInput, type: OpportunityType): boolean {
  const expected = OPPORTUNITY_TYPE_TO_CAPABILITIES[type];
  if (expected.length === 0) return false;
  const names = [fit.knowledgeName, ...fit.tags.map((tag) => tag.canonicalName)];
  return expected.some((capability) => names.some((name) => name.toLowerCase() === capability.toLowerCase()));
}

export function deriveOpportunityMaturity(input: {
  triggerSignals: AccountSignalInput[];
  relatedSignals: AccountSignalInput[];
  themeCount: number;
  fitLevel: string;
  hasAccountIntelligence: boolean;
  explicitProgram: boolean;
  claimCount: number;
}): OpportunityMaturity {
  const activeTriggers = input.triggerSignals.filter((signal) => signal.status === "active");
  const related = input.relatedSignals.filter((signal) => signal.status === "active");
  const highFit = input.fitLevel === "high";
  const mediumOrHighFit = input.fitLevel === "high" || input.fitLevel === "medium";
  if (
    input.explicitProgram &&
    related.length >= 2 &&
    input.claimCount >= 2 &&
    highFit &&
    input.hasAccountIntelligence
  ) {
    return "established";
  }
  if (related.length >= 2 && input.themeCount > 0 && mediumOrHighFit && input.hasAccountIntelligence) {
    return "developing";
  }
  if (activeTriggers.length <= 1 || !input.hasAccountIntelligence || !mediumOrHighFit) {
    return "emerging";
  }
  return "developing";
}

export function deriveOpportunityRelevance(input: {
  fitLevel: string;
  triggerSignals: AccountSignalInput[];
  themeAligned: boolean;
  supportingCaseCount: number;
  knowledgeCoverage: number;
  typeAligned: boolean;
}): OpportunityLevel {
  let score = 0;
  if (input.fitLevel === "high") score += 3;
  else if (input.fitLevel === "medium") score += 2;
  for (const signal of input.triggerSignals) {
    score += 1;
    if (signal.importance === "high") score += 1;
  }
  if (input.themeAligned) score += 2;
  if (input.supportingCaseCount > 0) score += 1;
  if (input.knowledgeCoverage >= 2) score += 1;
  if (input.typeAligned) score += 2;
  if (input.fitLevel === "low" || (!input.typeAligned && input.triggerSignals.length <= 1)) {
    score = Math.min(score, 3);
  }
  if (score >= 8) return "high";
  if (score >= 4) return "medium";
  return "low";
}

export function deriveOpportunityUrgency(input: {
  triggerSignals: AccountSignalInput[];
  now?: Date;
}): OpportunityLevel {
  const now = input.now ?? new Date();
  if (input.triggerSignals.length === 0) return "low";
  const recencies = input.triggerSignals.map((signal) => recencyScore(signal.eventDate, signal.createdAt, now));
  const maxRecency = Math.max(...recencies, 0);
  const outdated = input.triggerSignals.every((signal) => recencyScore(signal.eventDate, signal.createdAt, now) === 0);
  if (outdated) return "low";

  const urgentTypes = new Set([
    "restructuring",
    "new_facility",
    "plant_closure",
    "leadership_change",
    "financial_pressure",
    "workforce_change",
  ]);
  const hasUrgentType = input.triggerSignals.some((signal) => urgentTypes.has(signal.signalType));
  const hasAnnouncedProgram = input.triggerSignals.some((signal) =>
    ["announced", "reported_actual"].includes(signal.assertionMode) &&
    ["restructuring", "cost_reduction_program", "sustainability_program", "digital_transformation"].includes(
      signal.signalType,
    ),
  );
  if (maxRecency >= 2 && (hasUrgentType || hasAnnouncedProgram)) return "high";
  if (maxRecency >= 1) return "medium";
  return "low";
}

export function deriveOpportunityConfidence(input: {
  triggerSignals: AccountSignalInput[];
  relatedSignals: AccountSignalInput[];
  fitLevel: string;
  themeAligned: boolean;
  opportunityType: OpportunityType;
}): OpportunityConfidenceTier {
  void input.opportunityType;
  const explicitNeed = input.triggerSignals.some(
    (signal) =>
      EXPLICIT_NEED_SIGNAL_TYPES.has(signal.signalType) &&
      ["announced", "reported_actual"].includes(signal.assertionMode),
  );
  const sourceStatesNeed = input.triggerSignals.some((signal) =>
    /\b(needs|need for|seeking|requires)\b/i.test(`${signal.title} ${signal.summary}`),
  );
  if (explicitNeed && sourceStatesNeed) return "direct";
  if (
    input.relatedSignals.length >= 2 &&
    (input.fitLevel === "high" || input.fitLevel === "medium") &&
    input.themeAligned
  ) {
    return "supported";
  }
  if (explicitNeed && input.fitLevel !== "low") return "supported";
  return "inferred";
}

export function conservativeAssertionMode(signals: AccountSignalInput[]): OpportunityAssertionMode {
  let best: OpportunityAssertionMode = "announced";
  let bestRank = CONSERVATIVE_ASSERTION.length;
  for (const signal of signals) {
    const rank = CONSERVATIVE_ASSERTION.indexOf(signal.assertionMode as OpportunityAssertionMode);
    if (rank >= 0 && rank < bestRank) {
      bestRank = rank;
      best = signal.assertionMode as OpportunityAssertionMode;
    }
  }
  return best;
}

export function themeAligns(themes: OpportunityDerivationInput["themes"], type: OpportunityType): boolean {
  const expected = OPPORTUNITY_TYPE_TO_CAPABILITIES[type].map((name) => name.toLowerCase());
  const problems: Partial<Record<OpportunityType, string[]>> = {
    ramp_up: ["ramp-up", "capacity"],
    asset_productivity: ["capacity", "ramp-up"],
    cost_reduction: ["cost"],
    sustainability: ["sustainability"],
    strategy_execution: ["strategy"],
    restructuring_support: ["cost", "transformation"],
  };
  const extra = problems[type] ?? [];
  return themes.some((theme) => {
    const name = theme.canonicalName.toLowerCase();
    return expected.includes(name) || extra.includes(name);
  });
}

export function levels(draft: Pick<OpportunityDraft, "maturity" | "relevanceLevel" | "urgencyLevel">) {
  return {
    maturity: draft.maturity,
    relevance: draft.relevanceLevel,
    urgency: draft.urgencyLevel,
  };
}

export function temporalLabel(signal: AccountSignalInput): string {
  return classifyTemporalState({
    assertionMode: signal.assertionMode,
    signalNature: signal.signalNature,
    eventDate: signal.eventDate,
  });
}
