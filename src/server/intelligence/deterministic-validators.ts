import { ACCOUNT_INTELLIGENCE_DETERMINISTIC_VALIDATOR_VERSION } from "@/server/ai/versions";
import type { ValidationRecord } from "@/server/extraction/validation-types";
import {
  accountNarrativeHasForbiddenLanguage,
  detectCausalOverreach,
  detectUnsupportedNarrativeInference,
} from "./commercial-language";
import { combinedNarrativeText, narrativeMentionsEfeso } from "./narrative";
import { ACCOUNT_INTELLIGENCE_SECTIONS, SIGNAL_TYPE_SECTION } from "./taxonomy";
import { classifyTemporalState } from "./temporal";
import type { AccountIntelligenceDeterministicContext } from "./types";

function record(
  code: string,
  result: ValidationRecord["result"],
  severity: ValidationRecord["severity"],
  message: string,
  details: Record<string, unknown> = {},
): ValidationRecord {
  return {
    validatorCode: code,
    validatorVersion: ACCOUNT_INTELLIGENCE_DETERMINISTIC_VALIDATOR_VERSION,
    validatorType: "deterministic",
    result,
    severity,
    message,
    details,
  };
}

export function runAccountIntelligenceDeterministicValidators(
  input: AccountIntelligenceDeterministicContext,
): ValidationRecord[] {
  return [
    companyExists(input),
    signalExists(input),
    allSignalsActive(input),
    workspaceConsistency(input),
    companyConsistency(input),
    chronologyConsistency(input),
    assertionModeConsistency(input),
    unsupportedSectionDetection(input),
    duplicateVersionDetection(input),
    narrativeLanguage(input),
  ];
}

function companyExists(input: AccountIntelligenceDeterministicContext): ValidationRecord {
  if (!input.companyExists) {
    return record("company_exists", "fail", "blocking", "Company was not found in the workspace.");
  }
  if (!input.companyResolved) {
    return record("company_exists", "warn", "review", "Company is not resolved.", { company_id: input.companyId });
  }
  return record("company_exists", "pass", "info", "Company exists and is resolved.");
}

function signalExists(input: AccountIntelligenceDeterministicContext): ValidationRecord {
  const missing = input.signalLinks.filter((link) => !input.signals.some((signal) => signal.id === link.signalId));
  if (missing.length > 0 || input.signals.length === 0) {
    return record("signal_exists", "fail", "blocking", "Account intelligence requires existing Signals.", {
      missing: missing.map((row) => row.signalId),
    });
  }
  return record("signal_exists", "pass", "info", "All linked Signals exist.");
}

function allSignalsActive(input: AccountIntelligenceDeterministicContext): ValidationRecord {
  const inactive = input.signals.filter((signal) => signal.status !== "active");
  if (inactive.length > 0) {
    return record("all_signals_active", "fail", "blocking", "Inactive or review Signals cannot enter active Account Intelligence.", {
      ids: inactive.map((signal) => signal.id),
    });
  }
  return record("all_signals_active", "pass", "info", "All linked Signals are active.");
}

function workspaceConsistency(input: AccountIntelligenceDeterministicContext): ValidationRecord {
  const foreign = input.signals.filter((signal) => signal.workspaceId !== input.workspaceId);
  if (foreign.length > 0) {
    return record("workspace_consistency", "fail", "blocking", "A linked Signal belongs to another workspace.");
  }
  return record("workspace_consistency", "pass", "info", "Workspace is consistent.");
}

function companyConsistency(input: AccountIntelligenceDeterministicContext): ValidationRecord {
  const foreign = input.signals.filter((signal) => signal.companyId !== input.companyId);
  if (foreign.length > 0) {
    return record("company_consistency", "fail", "blocking", "A linked Signal belongs to another company.");
  }
  return record("company_consistency", "pass", "info", "Company is consistent.");
}

function chronologyConsistency(input: AccountIntelligenceDeterministicContext): ValidationRecord {
  const text = combinedNarrativeText(input.draft).toLowerCase();
  const planned = input.signals.filter((signal) =>
    ["planned", "expected", "target"].includes(signal.assertionMode),
  );
  const collapsed = planned.filter((signal) => {
    const realized =
      /\b(has already|already increased|capacity has already|is now complete)\b/i.test(text) &&
      text.includes(signal.title.toLowerCase().slice(0, 24));
    return realized;
  });
  if (/\bcurrent\b/.test(text) && planned.length > 0 && !/planned|expected|target/.test(text)) {
    return record("chronology_consistency", "fail", "blocking", "Planned or expected Signals were collapsed into current tense.");
  }
  if (collapsed.length > 0) {
    return record("chronology_consistency", "fail", "blocking", "A planned or expected Signal was described as realized.");
  }
  return record("chronology_consistency", "pass", "info", "Temporal language is consistent with assertion modes.");
}

function assertionModeConsistency(input: AccountIntelligenceDeterministicContext): ValidationRecord {
  const text = combinedNarrativeText(input.draft);
  for (const signal of input.signals) {
    const state = classifyTemporalState(signal);
    if (
      ["planned", "expected", "target"].includes(signal.assertionMode) &&
      /\b(has already|already increased|capacity has already)\b/i.test(text)
    ) {
      return record("assertion_mode_consistency", "fail", "blocking", "Narrative overstates an uncertain assertion mode.", {
        signal_id: signal.id,
        temporal_state: state,
      });
    }
  }
  return record("assertion_mode_consistency", "pass", "info", "Assertion modes are preserved.");
}

function unsupportedSectionDetection(input: AccountIntelligenceDeterministicContext): ValidationRecord {
  const filled = ACCOUNT_INTELLIGENCE_SECTIONS.filter((key) => Boolean(input.draft.sections[key]?.trim()));
  const supported = new Set(
    input.signals.map((signal) => SIGNAL_TYPE_SECTION[signal.signalType]).filter(Boolean),
  );
  if (input.signals.some((signal) => ["planned", "expected", "target", "conditional", "unspecified"].includes(signal.assertionMode))) {
    supported.add("unresolved_questions");
  }
  const unsupported = filled.filter((key) => key !== "unresolved_questions" && !supported.has(key));
  if (unsupported.length > 0) {
    return record("unsupported_section_detection", "fail", "blocking", "A narrative section has no supporting Signal type.", {
      sections: unsupported,
    });
  }
  return record("unsupported_section_detection", "pass", "info", "Filled sections have supporting Signals.");
}

function duplicateVersionDetection(input: AccountIntelligenceDeterministicContext): ValidationRecord {
  if (input.existingFingerprints.length > 0) {
    return record("duplicate_version_detection", "warn", "review", "An Account Intelligence fingerprint already exists for this signal set.", {
      fingerprints: input.existingFingerprints,
    });
  }
  return record("duplicate_version_detection", "pass", "info", "No duplicate active fingerprint.");
}

function narrativeLanguage(input: AccountIntelligenceDeterministicContext): ValidationRecord {
  const text = combinedNarrativeText(input.draft);
  const forbidden = accountNarrativeHasForbiddenLanguage(text);
  if (narrativeMentionsEfeso(input.draft) || forbidden.length > 0) {
    return record("schema_validity", "fail", "blocking", "Account narrative contains commercial language or mentions EFESO.", {
      matches: forbidden,
    });
  }
  const unsupported = detectUnsupportedNarrativeInference(text);
  if (unsupported.length > 0) {
    return record("unsupported_inference", "fail", "blocking", "Narrative contains an unsupported inference.", {
      matches: unsupported,
    });
  }
  const causal = detectCausalOverreach(text);
  if (causal.length > 0) {
    return record("causal_overreach", "fail", "blocking", "Narrative asserts unsupported causality.", { matches: causal });
  }
  return record("schema_validity", "pass", "info", "Narrative language is evidence-bound.");
}

export function hasBlockingIntelligenceFailure(records: ValidationRecord[]): boolean {
  return records.some((row) => row.result === "fail" && row.severity === "blocking");
}

export function runFitDeterministicValidators(input: {
  companyExists: boolean;
  knowledgeActive: boolean;
  knowledgeObjectType: string;
  signalsActive: boolean;
  components: { contribution: number; componentType: string }[];
  proposedFitLevel: string;
  derivedFitLevel: string;
  proposedFitScore: number;
  derivedFitScore: number;
}): ValidationRecord[] {
  const version = ACCOUNT_INTELLIGENCE_DETERMINISTIC_VALIDATOR_VERSION;
  const rec = (
    code: string,
    result: ValidationRecord["result"],
    severity: ValidationRecord["severity"],
    message: string,
    details: Record<string, unknown> = {},
  ): ValidationRecord => ({
    validatorCode: code,
    validatorVersion: version,
    validatorType: "deterministic",
    result,
    severity,
    message,
    details,
  });

  const records: ValidationRecord[] = [];
  records.push(
    input.companyExists
      ? rec("company_exists", "pass", "info", "Company exists.")
      : rec("company_exists", "fail", "blocking", "Company was not found."),
  );
  records.push(
    input.knowledgeActive
      ? rec("knowledge_active", "pass", "info", "Knowledge object is active.")
      : rec("knowledge_active", "fail", "blocking", "Knowledge object is not active and cannot enter an active fit."),
  );
  records.push(
    input.signalsActive
      ? rec("all_signals_active", "pass", "info", "Fit uses only active Signals.")
      : rec("all_signals_active", "fail", "blocking", "A non-active Signal was used in fit derivation."),
  );
  const positive = input.components.filter((row) => row.contribution > 0);
  records.push(
    positive.length > 0
      ? rec("components_present", "pass", "info", "Fit has transparent components.")
      : rec("components_present", "fail", "blocking", "Fit has no positive components."),
  );
  records.push(
    input.proposedFitLevel === input.derivedFitLevel && input.proposedFitScore === input.derivedFitScore
      ? rec("deterministic_score_authority", "pass", "info", "Fit level and score match the deterministic derivation.")
      : rec(
          "deterministic_score_authority",
          "fail",
          "blocking",
          "Proposed fit level or score disagrees with the deterministic derivation.",
          {
            proposed_level: input.proposedFitLevel,
            derived_level: input.derivedFitLevel,
            proposed_score: input.proposedFitScore,
            derived_score: input.derivedFitScore,
          },
        ),
  );
  const industryOnly = positive.length === 1 && positive[0]?.componentType === "industry_match";
  if (industryOnly && input.derivedFitLevel === "high") {
    records.push(rec("industry_only_not_high", "fail", "blocking", "Industry match alone cannot produce high fit."));
  } else {
    records.push(rec("industry_only_not_high", "pass", "info", "Fit is not an industry-only high score."));
  }
  return records;
}
