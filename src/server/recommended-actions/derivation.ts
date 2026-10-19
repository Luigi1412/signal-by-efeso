import type { OpportunityLevel, OpportunityMaturity } from "@/server/opportunities/taxonomy";
import type { RelationshipStrength } from "@/server/relationship/taxonomy";
import type { ActionConfidenceTier, ActionPriority, ActionType } from "./taxonomy";
import type { ActionDerivationInput, ActionDraft } from "./types";

const PRIORITY_RANK: Record<ActionPriority, number> = { low: 0, medium: 1, high: 2 };

export function deriveActionPriority(input: {
  opportunityRelevance: OpportunityLevel | null;
  opportunityUrgency: OpportunityLevel | null;
  maturity: OpportunityMaturity | null;
  relationshipStrength: RelationshipStrength;
}): ActionPriority {
  if (!input.opportunityRelevance || input.opportunityRelevance === "low") return "low";
  if (input.opportunityRelevance === "high" && input.opportunityUrgency === "high") return "high";
  if (input.opportunityRelevance === "high" && input.relationshipStrength === "unknown") return "high";
  if (input.opportunityRelevance === "high") return "medium";
  return "medium";
}

export function deriveActionConfidence(input: {
  actionType: ActionType;
  relationshipStrength: RelationshipStrength;
  hasAccountOwner: boolean;
  opportunityExplicit: boolean;
}): ActionConfidenceTier {
  if (input.actionType === "contact_account_owner" && input.hasAccountOwner && input.opportunityExplicit) {
    return "direct";
  }
  if (input.relationshipStrength === "unknown" && actionTouchesRelationship(input.actionType)) {
    return "inferred";
  }
  if (input.opportunityExplicit) return "supported";
  return "inferred";
}

export function actionTouchesRelationship(actionType: ActionType): boolean {
  return (
    actionType === "validate_relationship" ||
    actionType === "reconnect_existing_relationship" ||
    actionType === "contact_account_owner" ||
    actionType === "align_internal_team"
  );
}

export function chooseActionType(input: ActionDerivationInput): ActionType {
  const opportunity = input.opportunity;
  const rel = input.relationship;
  if (!opportunity || opportunity.status !== "active") {
    if (rel.strength === "unknown") return "validate_account_context";
    return "monitor_development";
  }
  if (opportunity.relevanceLevel === "low") return "monitor_development";
  if (rel.strength === "unknown") return "validate_relationship";
  if (opportunity.maturity === "emerging" && opportunity.urgencyLevel === "low") return "monitor_development";
  if (opportunity.relevanceLevel === "high" && (rel.strength === "weak" || rel.strength === "none")) {
    return "validate_relationship";
  }
  if (opportunity.relevanceLevel === "high" && rel.strength === "strong" && rel.hasAccountOwner) {
    return "contact_account_owner";
  }
  if (opportunity.relevanceLevel === "high" && rel.strength === "strong") return "align_internal_team";
  if (rel.status === "former_client") return "reconnect_existing_relationship";
  if (input.hasRelevantCase) return "review_relevant_case";
  return "prepare_internal_brief";
}

export function proposeActionDrafts(input: ActionDerivationInput): ActionDraft[] {
  const drafts: ActionDraft[] = [];
  const primary = buildDraft(input, chooseActionType(input));
  drafts.push(primary);
  if (
    input.opportunity &&
    input.opportunity.status === "active" &&
    input.hasRelevantCase &&
    primary.actionType !== "review_relevant_case" &&
    input.opportunity.relevanceLevel !== "low"
  ) {
    drafts.push(buildDraft(input, "review_relevant_case"));
  }
  if (
    input.opportunity &&
    input.opportunity.status === "active" &&
    input.opportunity.relevanceLevel === "high" &&
    input.relationship.strength === "strong" &&
    input.relationship.hasAccountOwner &&
    primary.actionType === "contact_account_owner"
  ) {
    drafts.push(buildDraft(input, "align_internal_team"));
  }
  return drafts;
}

function buildDraft(input: ActionDerivationInput, actionType: ActionType): ActionDraft {
  const opportunity = input.opportunity;
  const rel = input.relationship;
  const priority = deriveActionPriority({
    opportunityRelevance: opportunity?.relevanceLevel ?? null,
    opportunityUrgency: opportunity?.urgencyLevel ?? null,
    maturity: opportunity?.maturity ?? null,
    relationshipStrength: rel.strength,
  });
  const confidence = deriveActionConfidence({
    actionType,
    relationshipStrength: rel.strength,
    hasAccountOwner: rel.hasAccountOwner,
    opportunityExplicit: Boolean(opportunity && opportunity.status === "active"),
  });
  const ownerLabel = rel.accountOwnerName ?? "Responsável interno não identificado";
  const title = titleFor(actionType, opportunity?.title ?? null);
  const uncertainty =
    rel.strength === "unknown"
      ? "Dados de relacionamento indisponíveis. Ausência de dado não significa ausência de relacionamento."
      : "A ação é uma sugestão estruturada e não executa contato automático.";
  const rationaleBlocks = [
    {
      rationaleType: "opportunity_context" as const,
      statement: opportunity
        ? `${opportunity.title} (relevância ${opportunity.relevanceLevel}, urgência ${opportunity.urgencyLevel}).`
        : "Não há oportunidade ativa. Ação comercial não se justifica.",
      sourceType: opportunity ? "opportunity" : null,
      sourceId: opportunity?.id ?? null,
    },
    {
      rationaleType: "relationship_context" as const,
      statement:
        rel.id == null && rel.strength === "unknown"
          ? "Dados de relacionamento indisponíveis."
          : `Força do relacionamento: ${rel.strength}. Responsável da conta: ${ownerLabel}.`,
      sourceType: rel.id ? "account_relationship" : null,
      sourceId: rel.id,
    },
    {
      rationaleType: "urgency_context" as const,
      statement: opportunity
        ? `Urgência da oportunidade: ${opportunity.urgencyLevel}; maturidade: ${opportunity.maturity}.`
        : "Não há urgência de oportunidade.",
      sourceType: opportunity ? "opportunity" : null,
      sourceId: opportunity?.id ?? null,
    },
    {
      rationaleType: "efeso_context" as const,
      statement: opportunity?.primaryCapability
        ? `Capacidades EFESO relevantes incluem ${opportunity.primaryCapability}.`
        : "A aderência EFESO permanece ligada ao Fit existente, se houver.",
      sourceType: opportunity ? "opportunity" : null,
      sourceId: opportunity?.id ?? null,
    },
    {
      rationaleType: "uncertainty" as const,
      statement: uncertainty,
      sourceType: rel.id ? "account_relationship" : null,
      sourceId: rel.id,
    },
  ];
  return {
    actionType,
    title,
    rationale: rationaleBlocks.map((block) => block.statement).join(" "),
    priority,
    confidenceTier: confidence,
    opportunityId: opportunity?.id ?? null,
    relationshipId: rel.id,
    knowledgeObjectIds: opportunity?.knowledgeObjectIds ?? [],
    opportunityLinks: opportunity
      ? [{ opportunityId: opportunity.id, relationshipType: "primary" }]
      : [],
    relationshipLinks: rel.id ? [{ accountRelationshipId: rel.id, relationshipType: "informs" }] : [],
    knowledgeLinks: (opportunity?.knowledgeObjectIds ?? []).slice(0, 2).map((id) => ({
      knowledgeObjectId: id,
      relationshipType: actionType === "review_relevant_case" ? "case" : "brief",
    })),
    rationaleBlocks,
  };
}

function titleFor(actionType: ActionType, opportunityTitle: string | null): string {
  const suffix = opportunityTitle ? ` ligada a ${opportunityTitle}` : "";
  switch (actionType) {
    case "validate_relationship":
      return "Validar o relacionamento com a conta";
    case "validate_account_context":
      return "Validar o contexto da conta antes de ação comercial";
    case "reconnect_existing_relationship":
      return "Retomar internamente o relacionamento existente";
    case "contact_account_owner":
      return "Alinhar com o responsável da conta registrado";
    case "align_internal_team":
      return "Alinhar o time interno sobre a oportunidade";
    case "review_relevant_case":
      return `Revisar um caso EFESO relevante${suffix}`;
    case "prepare_internal_brief":
      return `Preparar um brief interno${suffix}`;
    case "explore_client_need":
      return "Explorar se há uma necessidade emergente do cliente";
    case "prepare_meeting_hypothesis":
      return "Preparar uma hipótese de reunião para uso interno";
    case "monitor_development":
      return "Monitorar o desenvolvimento, sem contato externo";
    case "no_action":
      return "Nenhuma ação necessária";
    default:
      return "Outra ação recomendada";
  }
}

export function clampPriority(derived: ActionPriority, suggested: ActionPriority | null): ActionPriority {
  if (!suggested) return derived;
  return PRIORITY_RANK[suggested] > PRIORITY_RANK[derived] ? derived : suggested;
}
