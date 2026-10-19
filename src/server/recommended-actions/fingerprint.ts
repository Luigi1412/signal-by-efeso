import { sha256Json } from "@/server/extraction/sha256";
import type { ActionDraft } from "./types";

export function computeActionFingerprint(input: {
  companyId: string;
  opportunityId: string | null;
  actionType: string;
  relationshipId: string | null;
}): string {
  return sha256Json({
    company_id: input.companyId,
    opportunity_id: input.opportunityId,
    action_type: normalizeActionFamily(input.actionType),
    relationship_id: input.relationshipId,
  });
}

export function fingerprintFromDraft(companyId: string, draft: ActionDraft): string {
  return computeActionFingerprint({
    companyId,
    opportunityId: draft.opportunityId,
    actionType: draft.actionType,
    relationshipId: draft.relationshipId,
  });
}

function normalizeActionFamily(actionType: string): string {
  if (
    actionType === "validate_relationship" ||
    actionType === "validate_account_context"
  ) {
    return "validate_access";
  }
  return actionType;
}
