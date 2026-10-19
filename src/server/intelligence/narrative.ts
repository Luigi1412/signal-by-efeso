import type { AccountNarrativeDraft, AccountSignalInput } from "./types";
import { SIGNAL_TYPE_SECTION } from "./taxonomy";
import { classifyTemporalState } from "./temporal";

const UNCERTAIN_MODES = new Set(["planned", "expected", "target", "estimated", "conditional", "unspecified"]);

function temporalLabel(signal: AccountSignalInput): string {
  return classifyTemporalState({
    assertionMode: signal.assertionMode,
    signalNature: signal.signalNature,
    eventDate: signal.eventDate,
  });
}

function lineFor(signal: AccountSignalInput): string {
  const when = signal.eventDate ? ` (${signal.eventDate})` : "";
  return `${signal.title} [${temporalLabel(signal)} · ${signal.assertionMode}${when}]`;
}

function joinLines(signals: AccountSignalInput[]): string | null {
  if (signals.length === 0) return null;
  return signals.map((signal) => lineFor(signal)).join(" ");
}

export function buildDeterministicNarrative(input: {
  companyName: string;
  signals: AccountSignalInput[];
}): AccountNarrativeDraft {
  const signals = input.signals.filter((signal) => signal.status === "active");
  const changing = signals.filter((signal) => signal.signalNature === "event");
  const priorities = signals.filter((signal) => SIGNAL_TYPE_SECTION[signal.signalType] === "strategic_priorities");
  const investments = signals.filter((signal) => SIGNAL_TYPE_SECTION[signal.signalType] === "investments_and_expansion");
  const pressures = signals.filter((signal) => SIGNAL_TYPE_SECTION[signal.signalType] === "operational_pressures");
  const risks = signals.filter(
    (signal) =>
      SIGNAL_TYPE_SECTION[signal.signalType] === "risk_and_constraints" ||
      SIGNAL_TYPE_SECTION[signal.signalType] === "financial_context",
  );
  const uncertain = signals.filter((signal) => UNCERTAIN_MODES.has(signal.assertionMode));

  const sections: AccountNarrativeDraft["sections"] = {};
  for (const signal of signals) {
    const key = SIGNAL_TYPE_SECTION[signal.signalType];
    if (!key) continue;
    const current = sections[key] ? `${sections[key]} ` : "";
    sections[key] = `${current}${lineFor(signal)}`.trim();
  }
  if (uncertain.length > 0) {
    sections.unresolved_questions = uncertain
      .map((signal) => `${signal.title} remains ${signal.assertionMode}; it is not treated as completed.`)
      .join(" ");
  }

  const dates = signals
    .map((signal) => signal.eventDate)
    .filter((value): value is string => Boolean(value))
    .sort();

  const headlineSignal = [...signals].sort((a, b) => {
    const rank = (value: string) => (value === "high" ? 3 : value === "medium" ? 2 : 1);
    return rank(b.importance) - rank(a.importance);
  })[0];

  return {
    headline: headlineSignal
      ? `${input.companyName}: ${headlineSignal.title}`
      : `${input.companyName}: no active signals`,
    executiveSummary: signals.length
      ? `Based on ${signals.length} active signal(s): ${signals.map((signal) => lineFor(signal)).join(" ")}`
      : "No active signals are available for this account.",
    strategicDirection: joinLines(priorities),
    pressureSummary: joinLines(pressures),
    investmentSummary: joinLines(investments),
    operatingContextSummary: joinLines(changing),
    riskSummary: joinLines(risks),
    changeSummary: joinLines(changing),
    sections,
    periodStart: dates[0] ?? null,
    periodEnd: dates[dates.length - 1] ?? null,
  };
}

export function narrativeMentionsEfeso(draft: AccountNarrativeDraft): boolean {
  return combinedNarrativeText(draft).toLowerCase().includes("efeso");
}

export function combinedNarrativeText(draft: AccountNarrativeDraft): string {
  return [
    draft.headline,
    draft.executiveSummary,
    draft.strategicDirection,
    draft.pressureSummary,
    draft.investmentSummary,
    draft.operatingContextSummary,
    draft.riskSummary,
    draft.changeSummary,
    ...Object.values(draft.sections),
  ]
    .filter(Boolean)
    .join("\n");
}
