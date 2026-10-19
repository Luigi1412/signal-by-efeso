import type { OpportunityLevel } from "@/server/opportunities/taxonomy";
import type {
  ActionQuadrant,
  ContactRole,
  DataQuality,
  RelationshipStatus,
  RelationshipStrength,
} from "./taxonomy";

export interface RelationshipDerivationInput {
  relationshipStatus: RelationshipStatus | null;
  recordedStrength: RelationshipStrength | null;
  hasRecord: boolean;
  hasAccountOwner: boolean;
  knownContactCount: number;
  lastInteractionAt: string | null;
  historicalProject: boolean;
  now?: Date;
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function monthsAgo(value: string | null, now: Date): number | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return (now.getTime() - parsed.getTime()) / MONTH_MS;
}

export function deriveRelationshipStrength(input: RelationshipDerivationInput): RelationshipStrength {
  if (!input.hasRecord) return "unknown";
  // Explicit recorded values (including manual admin override) are never replaced by inference.
  if (input.recordedStrength && input.recordedStrength !== "unknown") {
    return input.recordedStrength;
  }

  const now = input.now ?? new Date();
  const ageMonths = monthsAgo(input.lastInteractionAt, now);
  const recent = ageMonths != null && ageMonths <= 18;
  const old = ageMonths != null && ageMonths >= 48;

  if (
    (input.relationshipStatus === "active_client" || input.relationshipStatus === "strategic_account") &&
    input.hasAccountOwner &&
    recent
  ) {
    return "strong";
  }
  if (input.relationshipStatus === "strategic_account" && input.hasAccountOwner) {
    return "strong";
  }
  if (input.relationshipStatus === "active_client" && (input.hasAccountOwner || input.knownContactCount >= 2)) {
    return "medium";
  }
  if (input.relationshipStatus === "former_client") {
    if (old && !input.hasAccountOwner) return "weak";
    return "medium";
  }
  if (input.relationshipStatus === "dormant") return "weak";
  if (input.relationshipStatus === "prospect") {
    if (input.knownContactCount === 0) return "unknown";
    return "weak";
  }
  if (input.relationshipStatus === "unknown" || input.relationshipStatus == null) return "unknown";
  if (input.recordedStrength && input.recordedStrength !== "unknown") return input.recordedStrength;
  return "unknown";
}

export function deriveDataQuality(input: {
  hasRecord: boolean;
  sourceType: string | null;
  hasAccountOwner: boolean;
  lastInteractionAt: string | null;
}): DataQuality {
  if (!input.hasRecord) return "unknown";
  if (input.sourceType === "demo_seed" || input.sourceType === "manual_admin_entry") {
    if (input.hasAccountOwner && input.lastInteractionAt) return "verified";
    return "partial";
  }
  if (input.sourceType === "existing_internal_data" && input.hasAccountOwner) return "verified";
  return "partial";
}

export function getAccountActionQuadrant(input: {
  opportunityRelevance: OpportunityLevel | null;
  relationshipStrength: RelationshipStrength;
}): ActionQuadrant {
  if (input.relationshipStrength === "unknown") return "validate_access";
  if (!input.opportunityRelevance || input.opportunityRelevance === "low") return "monitor";
  if (input.opportunityRelevance === "high" && input.relationshipStrength === "strong") return "activate";
  if (input.opportunityRelevance === "high" && (input.relationshipStrength === "weak" || input.relationshipStrength === "none")) {
    return "build_access";
  }
  if (input.opportunityRelevance === "medium" && input.relationshipStrength === "strong") return "nurture";
  if (input.opportunityRelevance === "high") return "activate";
  if (input.opportunityRelevance === "medium") return "nurture";
  return "monitor";
}

export function isAccountOwnerRole(role: ContactRole): boolean {
  return role === "account_owner";
}
