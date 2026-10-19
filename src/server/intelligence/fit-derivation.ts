import { SIGNAL_TYPE_TAG_HINTS, mapCompanyIndustryToTag, type FitLevel } from "./taxonomy";
import { canonicalizeTagName } from "@/server/knowledge/taxonomy";
import { GENERIC_CAPABILITY_NAMES } from "@/server/knowledge/canonical-taxonomy";
import { sanitizeMemberExplanation } from "@/server/knowledge/governance";
import type {
  AccountSignalInput,
  FitComponentDraft,
  FitDerivationInput,
  FitDerivationResult,
  SignalKnowledgeMatchDraft,
} from "./types";

function cap(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

function tagNames(knowledge: FitDerivationInput["knowledge"], category: string): string[] {
  return knowledge.tags
    .filter((tag) => tag.category === category)
    .map((tag) => canonicalizeTagName(category, tag.canonicalName));
}

function signalTypeHints(signals: AccountSignalInput[]): { category: string; canonicalName: string; signalId: string }[] {
  const out: { category: string; canonicalName: string; signalId: string }[] = [];
  for (const signal of signals) {
    for (const hint of SIGNAL_TYPE_TAG_HINTS[signal.signalType] ?? []) {
      out.push({
        category: hint.category,
        canonicalName: canonicalizeTagName(hint.category, hint.canonicalName),
        signalId: signal.id,
      });
    }
    for (const tag of signal.tags) {
      out.push({
        category: tag.category,
        canonicalName: canonicalizeTagName(tag.category, tag.canonicalName),
        signalId: signal.id,
      });
    }
  }
  return out;
}

export function mapFitScoreToLevel(score: number): FitLevel {
  if (score >= 8) return "high";
  if (score >= 4) return "medium";
  return "low";
}

export function deriveEfesoFit(input: FitDerivationInput): FitDerivationResult {
  const components: FitComponentDraft[] = [];
  const matches: SignalKnowledgeMatchDraft[] = [];
  const knowledgeTags = input.knowledge.tags;
  const hints = signalTypeHints(input.signals);

  const companyIndustry = mapCompanyIndustryToTag(input.companyIndustry);
  const knowledgeIndustries = tagNames(input.knowledge, "INDUSTRY");
  if (companyIndustry && knowledgeIndustries.includes(companyIndustry)) {
    const tag = knowledgeTags.find((row) => row.category === "INDUSTRY" && row.canonicalName === companyIndustry);
    components.push({
      componentType: "industry_match",
      componentValue: companyIndustry,
      contribution: 2,
      explanation: `Company industry maps to ${companyIndustry}, which is tagged on this knowledge object.`,
      sourceType: "knowledge_tag",
      sourceId: tag?.tagId ?? null,
    });
    const industrySignal = input.signals.find((signal) =>
      signal.tags.some((tagRow) => tagRow.canonicalName === companyIndustry),
    );
    if (industrySignal) {
      matches.push({
        signalId: industrySignal.id,
        matchType: "industry",
        matchStrength: "strong",
        explanation: `Signal geography/industry tag matches ${companyIndustry}.`,
      });
    }
  } else if (companyIndustry && knowledgeIndustries.length > 0) {
    components.push({
      componentType: "industry_match",
      componentValue: knowledgeIndustries.join(", "),
      contribution: 0,
      explanation: `Company industry ${companyIndustry} does not match knowledge industries ${knowledgeIndustries.join(", ")}.`,
      sourceType: "knowledge_object",
      sourceId: input.knowledge.id,
    });
  }

  const knowledgeCapabilities = tagNames(input.knowledge, "CAPABILITY_DOMAIN");
  const knowledgeProblems = tagNames(input.knowledge, "BUSINESS_PROBLEM");
  const capabilityHits = hints.filter(
    (hint) => hint.category === "CAPABILITY_DOMAIN" && knowledgeCapabilities.includes(hint.canonicalName),
  );
  const problemHits = hints.filter(
    (hint) => hint.category === "BUSINESS_PROBLEM" && knowledgeProblems.includes(hint.canonicalName),
  );
  const uniqueCapability = [...new Set(capabilityHits.map((hit) => hit.canonicalName))];
  const uniqueProblems = [...new Set(problemHits.map((hit) => hit.canonicalName))];
  const capabilityScore = cap(uniqueCapability.length + uniqueProblems.length, 3);
  if (capabilityScore > 0) {
    const value = [...uniqueCapability, ...uniqueProblems].join(", ");
    components.push({
      componentType: uniqueProblems.length ? "business_problem_match" : "capability_match",
      componentValue: value,
      contribution: capabilityScore,
      explanation: `Account signals share capability/problem tags with this knowledge object: ${value}.`,
      sourceType: "knowledge_tag",
      sourceId: knowledgeTags.find((tag) => tag.canonicalName === uniqueCapability[0] || tag.canonicalName === uniqueProblems[0])?.tagId ?? null,
    });
    for (const hit of [...capabilityHits, ...problemHits]) {
      matches.push({
        signalId: hit.signalId,
        matchType: hit.category === "BUSINESS_PROBLEM" ? "business_problem" : "capability",
        matchStrength: capabilityScore >= 3 ? "strong" : capabilityScore === 2 ? "medium" : "weak",
        explanation: `Signal maps to ${hit.canonicalName}.`,
      });
    }
  }

  const typeHits = input.signals.filter((signal) =>
    (SIGNAL_TYPE_TAG_HINTS[signal.signalType] ?? []).some(
      (hint) =>
        (hint.category === "CAPABILITY_DOMAIN" && knowledgeCapabilities.includes(hint.canonicalName)) ||
        (hint.category === "BUSINESS_PROBLEM" && knowledgeProblems.includes(hint.canonicalName)),
    ),
  );
  if (typeHits.length > 0) {
    const contribution = cap(typeHits.length, 2);
    components.push({
      componentType: "signal_type_match",
      componentValue: typeHits.map((signal) => signal.signalType).join(", "),
      contribution,
      explanation: `Signal types ${typeHits.map((signal) => signal.signalType).join(", ")} map to this knowledge object's taxonomy.`,
      sourceType: "signal",
      sourceId: typeHits[0]?.id ?? null,
    });
  }

  const themeHits = input.themes.filter((theme) =>
    knowledgeTags.some(
      (tag) =>
        tag.category === theme.category &&
        canonicalizeTagName(tag.category, tag.canonicalName) === canonicalizeTagName(theme.category, theme.canonicalName),
    ),
  );
  if (themeHits.length > 0) {
    const contribution = cap(themeHits.reduce((sum, theme) => sum + Math.min(theme.signalCount, 2), 0), 2);
    components.push({
      componentType: "recurring_theme_match",
      componentValue: themeHits.map((theme) => theme.canonicalName).join(", "),
      contribution,
      explanation: `Recurring account themes overlap this knowledge object: ${themeHits.map((theme) => theme.canonicalName).join(", ")}.`,
      sourceType: "account_theme",
      sourceId: themeHits[0]?.tagId ?? null,
    });
    for (const theme of themeHits) {
      for (const signalId of theme.supportingSignalIds) {
        matches.push({
          signalId,
          matchType: "theme",
          matchStrength: theme.signalCount >= 3 ? "strong" : "medium",
          explanation: `Recurring theme ${theme.canonicalName}.`,
        });
      }
    }
  }

  const relatedCases = input.knowledge.relatedObjects.filter((row) => row.objectType === "case" || row.relationType === "demonstrates_capability");
  const selfIsCase = input.knowledge.objectType === "case";
  const industryAlignedCase =
    selfIsCase && companyIndustry && knowledgeIndustries.includes(companyIndustry) && capabilityScore > 0;
  if (selfIsCase) {
    const contribution = industryAlignedCase ? 2 : knowledgeIndustries.length > 0 && companyIndustry && !knowledgeIndustries.includes(companyIndustry) ? 0 : capabilityScore > 0 ? 1 : 0;
    components.push({
      componentType: "case_relevance",
      componentValue: input.knowledge.canonicalName,
      contribution,
      explanation: industryAlignedCase
        ? "This case shares industry and capability/problem tags with the account."
        : contribution === 0
          ? "This case is not industry-aligned with the account."
          : "This case has partial taxonomy overlap with the account.",
      sourceType: "knowledge_object",
      sourceId: input.knowledge.id,
    });
    if (contribution > 0 && typeHits[0]) {
      matches.push({
        signalId: typeHits[0].id,
        matchType: "case",
        matchStrength: contribution >= 2 ? "strong" : "weak",
        explanation: "Case taxonomy overlap with an account signal.",
      });
    }
  } else if (relatedCases.length > 0 && (industryAlignedCase || capabilityScore > 0)) {
    const caseIndustryOk = !companyIndustry || knowledgeIndustries.length === 0 || knowledgeIndustries.includes(companyIndustry);
    const contribution = caseIndustryOk && capabilityScore > 0 ? cap(relatedCases.length, 2) : 0;
    if (contribution > 0) {
      components.push({
        componentType: "case_relevance",
        componentValue: relatedCases.map((row) => row.canonicalName).join(", "),
        contribution,
        explanation: "Related EFESO case objects share taxonomy with this account context.",
        sourceType: "knowledge_object",
        sourceId: relatedCases[0]?.id ?? input.knowledge.id,
      });
    }
  }

  const knowledgeGeos = tagNames(input.knowledge, "GEOGRAPHY");
  const companyGeo = input.companyCountry === "BR" ? "Brazil" : null;
  const signalGeos = [...new Set(input.signals.map((signal) => signal.geography).filter(Boolean))] as string[];
  if (companyGeo && knowledgeGeos.includes(companyGeo)) {
    components.push({
      componentType: "geography_match",
      componentValue: companyGeo,
      contribution: 1,
      explanation: `Knowledge object is tagged ${companyGeo}, matching the company geography.`,
      sourceType: "knowledge_tag",
      sourceId: knowledgeTags.find((tag) => tag.canonicalName === companyGeo)?.tagId ?? null,
    });
  } else if (signalGeos.length > 1 && knowledgeGeos.length === 1) {
    components.push({
      componentType: "geography_match",
      componentValue: knowledgeGeos[0] ?? "mixed",
      contribution: 0,
      explanation: "Account signals span mixed geographies; geography is not generalized from a single knowledge tag.",
      sourceType: "company",
      sourceId: input.companyId,
    });
  }

  if (input.knowledge.objectType === "methodology" && capabilityScore > 0) {
    components.push({
      componentType: "methodology_match",
      componentValue: input.knowledge.canonicalName,
      contribution: 1,
      explanation: "Methodology object overlaps account capability/problem tags.",
      sourceType: "knowledge_object",
      sourceId: input.knowledge.id,
    });
  }

  const nature = input.knowledge.knowledgeNature;
  const proposedOrExpected =
    nature === "proposed_scope" || nature === "expected_benefit" || nature === "historical_benchmark" || nature === "commercial_claim";
  const credentialOrResult = input.knowledge.relatedObjects.filter(
    (row) => row.objectType === "credential" || row.objectType === "result" || row.relationType === "produces_result",
  );
  const deliveredResult =
    !proposedOrExpected &&
    (input.knowledge.objectType === "result" ||
      input.knowledge.outcomeStatus === "delivered" ||
      input.knowledge.outcomeStatus === "independently_verified");
  if (deliveredResult && capabilityScore > 0 && input.knowledge.objectType === "result") {
    components.push({
      componentType: "result_relevance",
      componentValue: input.knowledge.canonicalName,
      contribution: 1,
      explanation: "Delivered result supports the overlapping capability.",
      sourceType: "knowledge_object",
      sourceId: input.knowledge.id,
    });
  } else if (
    (input.knowledge.objectType === "credential" || credentialOrResult.length > 0) &&
    capabilityScore > 0 &&
    !proposedOrExpected
  ) {
    components.push({
      componentType: "credential_relevance",
      componentValue: input.knowledge.canonicalName,
      contribution: 1,
      explanation: "Credential or result object supports the overlapping capability.",
      sourceType: "knowledge_object",
      sourceId: input.knowledge.id,
    });
  }

  const scored = components.filter((row) => row.contribution > 0);
  const fitScore = scored.reduce((sum, row) => sum + row.contribution, 0);
  let fitLevel = mapFitScoreToLevel(fitScore);
  const hasProblem = scored.some((row) => row.componentType === "business_problem_match");
  const hasCapability = scored.some((row) => row.componentType === "capability_match");
  const hasCaseOrResult = scored.some(
    (row) => row.componentType === "case_relevance" || row.componentType === "result_relevance",
  );
  const onlyIndustryOrGeo = scored.every(
    (row) => row.componentType === "industry_match" || row.componentType === "geography_match",
  );
  const genericCapabilityOnly =
    hasCapability &&
    !hasProblem &&
    !hasCaseOrResult &&
    GENERIC_CAPABILITY_NAMES.some((name) => canonicalizeTagName("CAPABILITY_DOMAIN", input.knowledge.canonicalName) === name);
  if (onlyIndustryOrGeo || genericCapabilityOnly) {
    if (fitLevel === "high") fitLevel = "medium";
  }

  const sanitized = scored.map((row) => ({
    ...row,
    explanation: sanitizeMemberExplanation({
      explanation: row.explanation,
      visibilityLevel: input.knowledge.visibilityLevel ?? "efeso_member",
      confidentialityLevel: input.knowledge.confidentialityLevel ?? "internal",
    }),
  }));
  const rationale =
    sanitized.length === 0
      ? "Não há sobreposição taxonômica suficiente entre esta conta e o conhecimento EFESO disponível."
      : `Justificativa: ${sanitized.map((row) => `${humanFitComponent(row.componentType)} — ${row.componentValue}`).join("; ")}.`;

  const uniqueMatches = dedupeMatches(matches);
  return {
    fitLevel,
    fitScore,
    components: sanitized.length ? sanitized : components.filter((row) => row.contribution === 0).slice(0, 1),
    matches: uniqueMatches,
    rationale,
  };
}

function humanFitComponent(componentType: string): string {
  switch (componentType) {
    case "capability_match":
      return "capacidade";
    case "industry_match":
      return "setor";
    case "signal_type_match":
      return "tipo de movimento";
    case "geography_match":
      return "geografia";
    case "problem_match":
      return "problema";
    case "methodology_relevance":
      return "metodologia";
    case "credential_relevance":
      return "credencial";
    case "result_relevance":
      return "resultado";
    default:
      return "sobreposição";
  }
}

function dedupeMatches(matches: SignalKnowledgeMatchDraft[]): SignalKnowledgeMatchDraft[] {
  const seen = new Set<string>();
  const out: SignalKnowledgeMatchDraft[] = [];
  for (const match of matches) {
    const key = `${match.signalId}:${match.matchType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(match);
  }
  return out;
}

export function llmCannotOverrideFitLevel(deterministic: FitLevel, suggested: FitLevel | null): FitLevel {
  if (!suggested) return deterministic;
  const rank = { low: 0, medium: 1, high: 2 };
  if (rank[suggested] > rank[deterministic]) return deterministic;
  return deterministic;
}
