import type { AccountSignalInput } from "@/server/intelligence/types";
import {
  conservativeAssertionMode,
  deriveOpportunityConfidence,
  deriveOpportunityMaturity,
  deriveOpportunityRelevance,
  deriveOpportunityUrgency,
  fitAlignsWithType,
  opportunityTypesForSignal,
  temporalLabel,
  themeAligns,
} from "./derivation";
import type {
  ActiveFitInput,
  OpportunityDerivationInput,
  OpportunityDraft,
  OpportunityKnowledgeLinkDraft,
  OpportunityRationaleDraft,
} from "./types";
import type { OpportunityKnowledgeRelationship, OpportunityType } from "./taxonomy";
import { OPPORTUNITY_TYPE_TO_CAPABILITIES } from "./taxonomy";

const TYPE_LABEL: Record<OpportunityType, string> = {
  operational_excellence: "excelência operacional",
  asset_productivity: "produtividade de ativos",
  maintenance: "manutenção",
  ramp_up: "ramp-up",
  capacity_optimization: "otimização de capacidade",
  supply_chain: "cadeia de suprimentos",
  procurement: "suprimentos",
  working_capital: "capital de giro",
  cost_reduction: "redução de custo",
  restructuring_support: "apoio a reestruturação",
  performance_management: "gestão de performance",
  digital_transformation: "transformação digital",
  automation: "automação",
  sustainability: "sustentabilidade",
  decarbonization: "descarbonização",
  organization_transformation: "transformação organizacional",
  strategy_execution: "execução de estratégia",
  quality: "qualidade",
  productivity: "produtividade",
  transformation_management: "gestão da transformação",
  other: "outra",
};

function knowledgeRelationship(objectType: string): OpportunityKnowledgeRelationship {
  if (objectType === "service") return "service";
  if (objectType === "methodology") return "methodology";
  if (objectType === "case") return "case";
  if (objectType === "result") return "result";
  if (objectType === "credential") return "credential";
  return "capability";
}

function pickPrimaryFit(fits: ActiveFitInput[], type: OpportunityType): ActiveFitInput | null {
  const aligned = fits
    .filter((fit) => fit.status === "active" && fit.knowledgeStatus === "active" && fitAlignsWithType(fit, type))
    .sort((a, b) => rankFit(b.fitLevel) - rankFit(a.fitLevel));
  return aligned[0] ?? null;
}

function rankFit(level: string): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  if (level === "low") return 1;
  return 0;
}

function claimCount(signals: AccountSignalInput[]): number {
  return signals.reduce((sum, signal) => sum + signal.claims.length, 0);
}

function explicitProgram(signals: AccountSignalInput[], type: OpportunityType): boolean {
  return signals.some((signal) => {
    if (type === "restructuring_support" && signal.signalType === "restructuring") return true;
    if (type === "sustainability" && signal.signalType === "sustainability_program") return true;
    if (type === "cost_reduction" && signal.signalType === "cost_reduction_program") return true;
    if (type === "ramp_up" && signal.signalType === "production_ramp_up") return true;
    return false;
  });
}

export function proposeOpportunityDrafts(input: OpportunityDerivationInput): OpportunityDraft[] {
  const activeSignals = input.signals.filter((signal) => signal.status === "active");
  const activeFits = input.fits.filter((fit) => fit.status === "active" && fit.knowledgeStatus === "active");
  if (activeSignals.length === 0 || activeFits.length === 0) return [];

  const types = new Set<OpportunityType>();
  for (const signal of activeSignals) {
    for (const type of opportunityTypesForSignal(signal.signalType)) {
      if (type !== "other") types.add(type);
    }
  }

  const drafts: OpportunityDraft[] = [];
  for (const type of types) {
    const triggerSignals = activeSignals.filter((signal) => opportunityTypesForSignal(signal.signalType).includes(type));
    if (triggerSignals.length === 0) continue;
    if (type === "supply_chain" && triggerSignals.every((signal) => signal.signalType === "leadership_change")) {
      continue;
    }
    const primaryFit = pickPrimaryFit(activeFits, type);
    if (!primaryFit) continue;
    if (rankFit(primaryFit.fitLevel) < 2 && triggerSignals.length < 2) continue;

    const related = activeSignals.filter(
      (signal) =>
        triggerSignals.some((trigger) => trigger.id === signal.id) ||
        signal.tags.some((tag) =>
          OPPORTUNITY_TYPE_TO_CAPABILITIES[type].some((name) => name.toLowerCase() === tag.canonicalName.toLowerCase()),
        ),
    );
    const themeAligned = themeAligns(input.themes, type);
    const supportingCases = primaryFit.relatedCases.filter((row) => row.status === "active");
    const maturity = deriveOpportunityMaturity({
      triggerSignals,
      relatedSignals: related,
      themeCount: themeAligned ? 1 : 0,
      fitLevel: primaryFit.fitLevel,
      hasAccountIntelligence: Boolean(input.accountIntelligence && input.accountIntelligence.status === "active"),
      explicitProgram: explicitProgram(triggerSignals, type),
      claimCount: claimCount(related),
    });
    const relevance = deriveOpportunityRelevance({
      fitLevel: primaryFit.fitLevel,
      triggerSignals,
      themeAligned,
      supportingCaseCount: supportingCases.length,
      knowledgeCoverage: 1 + supportingCases.length + primaryFit.relatedMethodologies.length,
      typeAligned: fitAlignsWithType(primaryFit, type),
    });
    const urgency = deriveOpportunityUrgency({ triggerSignals });
    const confidence = deriveOpportunityConfidence({
      triggerSignals,
      relatedSignals: related,
      fitLevel: primaryFit.fitLevel,
      themeAligned,
      opportunityType: type,
    });
    const assertionMode = conservativeAssertionMode(triggerSignals);
    const label = TYPE_LABEL[type];
    const trigger = triggerSignals[0];
    const title = `Potencial oportunidade de ${label} ligada a ${trigger.title.replace(/\.$/, "")}`;
    const uncertainty =
      "A necessidade operacional ainda não foi confirmada explicitamente pelo cliente; isto permanece uma hipótese estruturada.";
    const summary = [
      `Observado: ${trigger.title}.`,
      `Uma necessidade de ${label} pode se tornar relevante.`,
      `Capacidades EFESO relevantes incluem ${primaryFit.knowledgeName}.`,
      `Apoiada por ${triggerSignals.length} sinal(is) gatilho e Fit EFESO ${primaryFit.fitLevel}.`,
      `Incerteza: ${uncertainty}`,
    ].join(" ");

    const supportingFits = activeFits.filter((fit) => fit.id !== primaryFit.id && rankFit(fit.fitLevel) >= 2).slice(0, 2);
    const knowledgeLinks: OpportunityKnowledgeLinkDraft[] = [
      {
        knowledgeObjectId: primaryFit.knowledgeObjectId,
        relationshipType: knowledgeRelationship(primaryFit.knowledgeType),
      },
      ...supportingCases.slice(0, 2).map((row) => ({
        knowledgeObjectId: row.id,
        relationshipType: "case" as const,
      })),
      ...primaryFit.relatedMethodologies
        .filter((row) => row.status === "active")
        .slice(0, 1)
        .map((row) => ({
          knowledgeObjectId: row.id,
          relationshipType: "methodology" as const,
        })),
    ];
    const rationaleBlocks: OpportunityRationaleDraft[] = [
      {
        rationaleType: "signal_trigger",
        statement: trigger.title,
        sourceType: "signal",
        sourceId: trigger.id,
      },
      {
        rationaleType: "account_context",
        statement: themeAligned
          ? `${input.themes.map((theme) => theme.canonicalName).join(", ")} recorrem nos sinais recentes.`
          : input.accountIntelligence?.headline ?? "O contexto da conta ainda está se formando a partir dos sinais disponíveis.",
        sourceType: input.accountIntelligence ? "account_intelligence" : "signal",
        sourceId: input.accountIntelligence?.id ?? trigger.id,
      },
      {
        rationaleType: "efeso_relevance",
        statement: `${primaryFit.knowledgeName} = ${primaryFit.fitLevel} Fit.`,
        sourceType: "efeso_fit",
        sourceId: primaryFit.id,
      },
      {
        rationaleType: "supporting_case",
        statement:
          supportingCases.length > 0
            ? `A EFESO tem ${supportingCases.length} caso(s) relacionado(s): ${supportingCases.map((row) => row.name).join(", ")}.`
            : `Capacidades EFESO relevantes incluem ${primaryFit.knowledgeName}.`,
        sourceType: "knowledge_object",
        sourceId: supportingCases[0]?.id ?? primaryFit.knowledgeObjectId,
      },
      {
        rationaleType: "urgency_reason",
        statement: `O estado temporal do sinal gatilho é ${temporalLabel(trigger)} (${trigger.assertionMode}).`,
        sourceType: "signal",
        sourceId: trigger.id,
      },
      {
        rationaleType: "uncertainty",
        statement: uncertainty,
        sourceType: "signal",
        sourceId: trigger.id,
      },
    ];

    drafts.push({
      title,
      summary,
      opportunityType: type,
      maturity,
      relevanceLevel: relevance,
      urgencyLevel: urgency,
      confidenceTier: confidence,
      assertionMode,
      geography: trigger.geography,
      rationale: rationaleBlocks.map((block) => `${block.rationaleType}: ${block.statement}`).join(" "),
      accountIntelligenceId: input.accountIntelligence?.status === "active" ? input.accountIntelligence.id : null,
      primaryEfesoFitId: primaryFit.id,
      parentOpportunityId: null,
      signalLinks: [
        ...triggerSignals.map((signal) => ({
          signalId: signal.id,
          relationshipType: "trigger" as const,
        })),
        ...related
          .filter((signal) => !triggerSignals.some((triggerRow) => triggerRow.id === signal.id))
          .slice(0, 2)
          .map((signal) => ({ signalId: signal.id, relationshipType: "contextual" as const })),
      ],
      fitLinks: [
        { efesoFitId: primaryFit.id, relationshipType: "primary" as const },
        ...supportingFits.map((fit) => ({ efesoFitId: fit.id, relationshipType: "supporting" as const })),
      ],
      knowledgeLinks,
      rationaleBlocks,
    });
  }
  return drafts;
}
